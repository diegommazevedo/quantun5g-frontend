/**
 * QUANTUM5G — Generate Expanded AI Report
 * Gera relatório expandido a partir da conversa com o agente.
 * Inclui insights da conversa + recomendações adicionais.
 */

import { createClient }         from '@supabase/supabase-js'
import { getGroq, GROQ_MODEL, REPORT_TEMPERATURE } from './groq-client'
import { embedBatch }           from './openai-embeddings'
import { SYSTEM_PROMPT, buildDiagnosticContext } from './system-prompt'
import type { DiagnosticResult, Laudo, AiReport, AiChatMessage } from '@/types/database'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Schema JSON expandido ────────────────────────────────────────

const EXPANDED_JSON_SCHEMA = `
Responda EXCLUSIVAMENTE com um JSON válido, sem markdown, sem \`\`\`json, sem explicações fora do JSON.
Este é um RELATÓRIO EXPANDIDO — mais profundo que o inicial, informado pela conversa entre consultor e agente.

A estrutura EXATA do JSON que você deve retornar:

{
  "narrativa_executiva": {
    "sintetico": "2-3 parágrafos densos — linguagem de CEO, incorporando os insights da conversa",
    "analitico": "6-8 parágrafos profundos — versão expandida com os aprofundamentos discutidos na conversa"
  },
  "plano_de_acao": [
    {
      "dimensao": "cultural",
      "prioridade": "P1",
      "narrativa": "texto expandido incorporando os refinamentos da conversa",
      "acoes": ["ação específica 1", "ação específica 2", "ação específica 3", "ação específica 4"],
      "prazo": "30 dias",
      "responsavel": "liderança"
    }
  ],
  "ferramentas_prescritas": [
    {
      "nome": "nome da ferramenta",
      "dimensao": "dimensao",
      "justificativa_especifica": "justificativa aprofundada pela conversa",
      "como_aplicar": "passo a passo detalhado para esta empresa específica",
      "resultado_esperado": {
        "30_dias": "resultado observável",
        "60_dias": "resultado observável",
        "90_dias": "resultado observável"
      }
    }
  ],
  "roteiro_devolutiva": {
    "abertura": "como iniciar a apresentação dado o que foi discutido na conversa",
    "desenvolvimento": ["ordem das dimensões refinada", "transições ajustadas"],
    "fechamento": "como propor o plano expandido",
    "frases_de_transicao": ["frase 1", "frase 2", "frase 3"]
  },
  "perguntas_aprofundamento": [
    {
      "pergunta": "texto da pergunta",
      "dimensao": "dimensao",
      "objetivo": "o que esta pergunta revela"
    }
  ],
  "insights_da_conversa": [
    {
      "insight": "descoberta ou aprofundamento que emergiu durante a conversa",
      "fonte": "o que motivou este insight (ex: pergunta do consultor sobre X)"
    }
  ],
  "recomendacoes_adicionais": [
    {
      "recomendacao": "recomendação que emergiu da conversa",
      "contexto": "por que esta recomendação é relevante para este caso",
      "dimensao": "dimensao relacionada"
    }
  ]
}`

// ── Parser robusto ───────────────────────────────────────────────

function parseGroqJson(raw: string): Record<string, unknown> {
  let clean = raw.trim()
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  try {
    return JSON.parse(clean) as Record<string, unknown>
  } catch {
    const start = clean.indexOf('{')
    const end   = clean.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>
    }
    throw new Error(`Groq retornou JSON inválido. Raw: ${raw.slice(0, 200)}`)
  }
}

// ── Função principal ─────────────────────────────────────────────

export async function generateExpandedReport(diagnosticId: string): Promise<{
  success: boolean
  error?:  string
  report?: AiReport
}> {
  const supabase = adminClient()
  const startMs  = Date.now()

  try {
    // 1. Busca dados do diagnóstico
    const { data: diag } = await supabase
      .from('diagnostics')
      .select('*, companies(name)')
      .eq('id', diagnosticId)
      .single()

    if (!diag) return { success: false, error: 'Diagnóstico não encontrado.' }

    const { data: result } = await supabase
      .from('diagnostic_results')
      .select('*')
      .eq('diagnostic_id', diagnosticId)
      .single() as { data: DiagnosticResult | null }

    if (!result) return { success: false, error: 'Resultado não calculado ainda.' }

    // 2. Busca laudos
    const laudoIds = [
      result.laudo_fisica_id, result.laudo_afetiva_id, result.laudo_racional_id,
      result.laudo_social_id, result.laudo_cultural_id,
    ].filter((v): v is string => !!v)

    const { data: laudosRows } = laudoIds.length > 0
      ? await supabase.from('laudos').select('*').in('id', laudoIds) as { data: Laudo[] | null }
      : { data: [] as Laudo[] }

    const laudos: Record<string, string> = {}
    for (const l of laudosRows ?? []) laudos[l.dimensao] = l.texto

    // 3. Busca relatório inicial
    const { data: initialReport } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('diagnostic_id', diagnosticId)
      .eq('report_type', 'inicial')
      .single() as { data: AiReport | null }

    if (!initialReport) return { success: false, error: 'Relatório inicial não gerado ainda.' }

    // 4. Busca histórico de chat completo
    const { data: chatHistory } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('diagnostic_id', diagnosticId)
      .order('created_at', { ascending: true }) as { data: AiChatMessage[] | null }

    if (!chatHistory || chatHistory.length < 6) {
      return { success: false, error: 'Converse mais com o agente (mínimo 3 trocas) antes de gerar o relatório expandido.' }
    }

    // 5. Monta contexto
    const companyName = (diag.companies as { name: string })?.name ?? 'Empresa'
    const diagnosticContext = buildDiagnosticContext({
      companyName,
      leaderName:   diag.leader_name,
      nRespondents: result.n_ic_respondents,
      result,
      laudos,
      aiReport: initialReport,
    })

    // 6. Monta histórico da conversa como texto
    const chatLines = chatHistory.slice(-30).map(m =>
      `${m.role === 'user' ? 'CONSULTOR' : 'AGENTE'}: ${m.content}`
    ).join('\n\n')

    // 7. Resumo do relatório inicial
    const initialNarrativa = initialReport.narrativa_executiva
    const initialSummary = typeof initialNarrativa === 'object' && initialNarrativa
      ? (initialNarrativa as { analitico?: string }).analitico ?? ''
      : ''

    // 8. Chama Groq
    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model:       GROQ_MODEL,
      temperature: REPORT_TEMPERATURE,
      max_tokens:  8192,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + '\n\n' + EXPANDED_JSON_SCHEMA,
        },
        {
          role: 'user',
          content: `Gere o RELATÓRIO EXPANDIDO em modo ANALÍTICO para este diagnóstico.

Este relatório é uma EVOLUÇÃO do relatório inicial, enriquecido pela conversa entre o consultor e o agente IA.

${diagnosticContext}

═══════════════════════════════════════
RELATÓRIO INICIAL (base para expansão):
═══════════════════════════════════════
${initialSummary}

═══════════════════════════════════════
CONVERSA CONSULTOR ↔ AGENTE (${chatHistory.length} mensagens):
═══════════════════════════════════════
${chatLines}

═══════════════════════════════════════
INSTRUÇÃO:
═══════════════════════════════════════
Com base no diagnóstico, no relatório inicial E na conversa acima:
1. Expanda a narrativa executiva incorporando os aprofundamentos da conversa
2. Refine o plano de ação com base nas questões levantadas
3. Ajuste as ferramentas prescritas conforme o contexto discutido
4. Atualize o roteiro de devolutiva
5. Adicione perguntas de aprofundamento relevantes
6. Extraia INSIGHTS DA CONVERSA — descobertas que emergiram do diálogo
7. Formule RECOMENDAÇÕES ADICIONAIS que surgiram da conversa

O relatório expandido deve ser MAIS PROFUNDO, MAIS ESPECÍFICO e MAIS ACIONÁVEL que o inicial.`,
        },
      ],
    })

    const rawContent = completion.choices[0]?.message?.content ?? ''
    const tokensUsed = completion.usage?.total_tokens ?? null
    const genTimeMs  = Date.now() - startMs

    // 9. Parseia JSON
    const parsed = parseGroqJson(rawContent)

    // 10. Upsert em ai_reports com report_type='expandido'
    const { data: saved, error: saveErr } = await supabase
      .from('ai_reports')
      .upsert({
        diagnostic_id:            diagnosticId,
        report_type:              'expandido',
        mode:                     'analitico',
        narrativa_executiva:      parsed.narrativa_executiva,
        plano_de_acao:            parsed.plano_de_acao,
        ferramentas_prescritas:   parsed.ferramentas_prescritas,
        roteiro_devolutiva:       parsed.roteiro_devolutiva,
        perguntas_aprofundamento: parsed.perguntas_aprofundamento,
        insights_da_conversa:     parsed.insights_da_conversa,
        recomendacoes_adicionais: parsed.recomendacoes_adicionais,
        source_chat_messages:     chatHistory.map(m => m.id),
        model_used:               GROQ_MODEL,
        tokens_used:              tokensUsed,
        generation_time_ms:       genTimeMs,
        generated_at:             new Date().toISOString(),
      }, { onConflict: 'diagnostic_id,report_type' })
      .select()
      .single()

    if (saveErr) return { success: false, error: saveErr.message }

    // 11. Gera embeddings em background
    generateExpandedEmbeddings(diagnosticId, parsed).catch(e =>
      console.error('[expanded_embeddings]', e)
    )

    return { success: true, report: saved as unknown as AiReport }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate_expanded_report]', msg)
    return { success: false, error: msg }
  }
}

// ── Embeddings para o relatório expandido ─────────────────────────

async function generateExpandedEmbeddings(
  diagnosticId: string,
  parsed: Record<string, unknown>,
) {
  const supabase = adminClient()

  type Chunk = { chunk_type: string; content: string }
  const chunks: Chunk[] = []

  const narrativa = parsed.narrativa_executiva as Record<string, string> | undefined
  if (narrativa?.analitico) {
    chunks.push({ chunk_type: 'narrativa_expandida', content: narrativa.analitico })
  }

  const plano = parsed.plano_de_acao as Array<Record<string, unknown>> | undefined
  for (const item of plano ?? []) {
    chunks.push({
      chunk_type: 'plano_acao_expandido',
      content: `${item.dimensao} (${item.prioridade}): ${item.narrativa}\nAções: ${(item.acoes as string[]).join('; ')}`,
    })
  }

  const insights = parsed.insights_da_conversa as Array<Record<string, string>> | undefined
  for (const ins of insights ?? []) {
    chunks.push({
      chunk_type: 'insight_conversa',
      content: `Insight: ${ins.insight}\nFonte: ${ins.fonte}`,
    })
  }

  const recs = parsed.recomendacoes_adicionais as Array<Record<string, string>> | undefined
  for (const rec of recs ?? []) {
    chunks.push({
      chunk_type: 'recomendacao_adicional',
      content: `${rec.dimensao}: ${rec.recomendacao}\nContexto: ${rec.contexto}`,
    })
  }

  if (chunks.length === 0) return

  const vectors = await embedBatch(chunks.map(c => c.content))

  // Não deleta embeddings do relatório inicial — adiciona os expandidos
  const rows = chunks.map((c, i) => ({
    diagnostic_id: diagnosticId,
    chunk_type:    c.chunk_type,
    content:       c.content,
    embedding:     JSON.stringify(vectors[i]),
  }))

  await supabase.from('diagnostic_embeddings').insert(rows)
}
