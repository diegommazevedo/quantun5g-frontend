/**
 * QUANTUM5G — generate_ai_report
 * Gera o super relatório IA via Groq e salva em ai_reports.
 * Depois cria embeddings dos chunks e salva em diagnostic_embeddings.
 *
 * Passo 3 da Entrega 6.
 */

import { createClient }         from '@supabase/supabase-js'
import { getGroq, GROQ_MODEL, REPORT_TEMPERATURE } from './groq-client'
import { embedBatch }           from './openai-embeddings'
import { SYSTEM_PROMPT, buildDiagnosticContext } from './system-prompt'
import type { DiagnosticResult, Laudo, AiReport } from '@/types/database'

// ─── Admin client (bypassa RLS) ───────────────────────────────

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ─── Schema JSON pedido ao Groq ───────────────────────────────

const JSON_SCHEMA_INSTRUCTION = `
Responda EXCLUSIVAMENTE com um JSON válido, sem markdown, sem \`\`\`json, sem explicações fora do JSON.
A estrutura EXATA do JSON que você deve retornar:

{
  "narrativa_executiva": {
    "sintetico": "2 parágrafos densos — linguagem de CEO",
    "analitico": "4-5 parágrafos profundos — linguagem de consultor sênior"
  },
  "plano_de_acao": [
    {
      "dimensao": "cultural",
      "prioridade": "P1",
      "narrativa": "texto explicando o que precisa acontecer e por quê nesta empresa",
      "acoes": ["ação específica 1", "ação específica 2", "ação específica 3"],
      "prazo": "30 dias",
      "responsavel": "liderança"
    }
  ],
  "ferramentas_prescritas": [
    {
      "nome": "nome da ferramenta",
      "dimensao": "dimensao",
      "justificativa_especifica": "por que ESTA ferramenta para ESTE diagnóstico",
      "como_aplicar": "passo a passo contextualizado para esta empresa",
      "resultado_esperado": {
        "30_dias": "resultado observável",
        "60_dias": "resultado observável",
        "90_dias": "resultado observável"
      }
    }
  ],
  "roteiro_devolutiva": {
    "abertura": "como iniciar a apresentação dado o nível do campo",
    "desenvolvimento": ["ordem das dimensões por impacto", "como transitar entre dimensões"],
    "fechamento": "como propor o plano de ação",
    "frases_de_transicao": ["frase 1", "frase 2", "frase 3"]
  },
  "perguntas_aprofundamento": [
    {
      "pergunta": "texto da pergunta",
      "dimensao": "dimensao",
      "objetivo": "o que esta pergunta revela quando o cliente responde"
    }
  ]
}`

// ─── Parser robusto ───────────────────────────────────────────

function parseGroqJson(raw: string): Record<string, unknown> {
  // Remove blocos markdown se existirem
  let clean = raw.trim()
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

  // Tenta parse direto
  try {
    return JSON.parse(clean) as Record<string, unknown>
  } catch {
    // Tenta encontrar o primeiro { } balanceado
    const start = clean.indexOf('{')
    const end   = clean.lastIndexOf('}')
    if (start !== -1 && end !== -1) {
      return JSON.parse(clean.slice(start, end + 1)) as Record<string, unknown>
    }
    throw new Error(`Groq retornou JSON inválido. Raw: ${raw.slice(0, 200)}`)
  }
}

// ─── Função principal ─────────────────────────────────────────

export async function generateAiReport(diagnosticId: string): Promise<{
  success: boolean
  error?:  string
  report?: AiReport
}> {
  const supabase = adminClient()
  const startMs  = Date.now()

  try {
    // ── 1. Busca dados do diagnóstico ────────────────────────
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

    // ── 2. Busca laudos ──────────────────────────────────────
    const laudoIds = [
      result.laudo_fisica_id, result.laudo_afetiva_id, result.laudo_racional_id,
      result.laudo_social_id, result.laudo_cultural_id,
    ].filter((v): v is string => !!v)

    const { data: laudosRows } = laudoIds.length > 0
      ? await supabase.from('laudos').select('*').in('id', laudoIds) as { data: Laudo[] | null }
      : { data: [] as Laudo[] }

    const laudos: Record<string, string> = {}
    for (const l of laudosRows ?? []) laudos[l.dimensao] = l.texto

    // ── 3. Monta contexto ────────────────────────────────────
    const companyName = (diag.companies as { name: string })?.name ?? 'Empresa'
    const context = buildDiagnosticContext({
      companyName,
      leaderName:   diag.leader_name,
      nRespondents: result.n_ic_respondents,
      result,
      laudos,
    })

    // ── 4. Chama Groq ────────────────────────────────────────
    const groq = getGroq()
    const completion = await groq.chat.completions.create({
      model:       GROQ_MODEL,
      temperature: REPORT_TEMPERATURE,
      max_tokens:  8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + JSON_SCHEMA_INSTRUCTION },
        { role: 'user',   content: `Gere a análise completa em modo ANALÍTICO para este diagnóstico:\n${context}` },
      ],
    })

    const rawContent = completion.choices[0]?.message?.content ?? ''
    const tokensUsed = completion.usage?.total_tokens ?? null
    const genTimeMs  = Date.now() - startMs

    // ── 5. Parseia JSON ──────────────────────────────────────
    const parsed = parseGroqJson(rawContent)

    // ── 6. Upsert em ai_reports ──────────────────────────────
    const { data: saved, error: saveErr } = await supabase
      .from('ai_reports')
      .upsert({
        diagnostic_id:            diagnosticId,
        mode:                     'analitico',
        narrativa_executiva:      parsed.narrativa_executiva,
        plano_de_acao:            parsed.plano_de_acao,
        ferramentas_prescritas:   parsed.ferramentas_prescritas,
        roteiro_devolutiva:       parsed.roteiro_devolutiva,
        perguntas_aprofundamento: parsed.perguntas_aprofundamento,
        model_used:               GROQ_MODEL,
        tokens_used:              tokensUsed,
        generation_time_ms:       genTimeMs,
        generated_at:             new Date().toISOString(),
      }, { onConflict: 'diagnostic_id' })
      .select()
      .single()

    if (saveErr) return { success: false, error: saveErr.message }

    // ── 7. Gera embeddings em background (não bloqueia) ──────
    generateEmbeddings(diagnosticId, parsed, context).catch(e =>
      console.error('[embeddings]', e)
    )

    return { success: true, report: saved as unknown as AiReport }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[generate_ai_report]', msg)
    return { success: false, error: msg }
  }
}

// ─── Geração de embeddings (async, não bloqueia o relatório) ──

async function generateEmbeddings(
  diagnosticId: string,
  parsed: Record<string, unknown>,
  fullContext: string,
) {
  const supabase = adminClient()

  type Chunk = { chunk_type: string; content: string }
  const chunks: Chunk[] = []

  // Chunk 1 — narrativa completa
  const narrativa = parsed.narrativa_executiva as Record<string, string> | undefined
  if (narrativa?.analitico) {
    chunks.push({ chunk_type: 'narrativa', content: narrativa.analitico })
  }

  // Chunks — plano de ação (um por dimensão)
  const plano = parsed.plano_de_acao as Array<Record<string, unknown>> | undefined
  for (const item of plano ?? []) {
    chunks.push({
      chunk_type: 'plano_acao',
      content: `${item.dimensao} (${item.prioridade}): ${item.narrativa}\nAções: ${(item.acoes as string[]).join('; ')}`,
    })
  }

  // Chunks — ferramentas
  const ferramentas = parsed.ferramentas_prescritas as Array<Record<string, unknown>> | undefined
  for (const f of ferramentas ?? []) {
    chunks.push({
      chunk_type: 'ferramenta',
      content: `${f.nome} (${f.dimensao}): ${f.justificativa_especifica}\nComo aplicar: ${f.como_aplicar}`,
    })
  }

  // Chunks — perguntas
  const perguntas = parsed.perguntas_aprofundamento as Array<Record<string, unknown>> | undefined
  for (const q of perguntas ?? []) {
    chunks.push({
      chunk_type: 'pergunta',
      content: `Pergunta (${q.dimensao}): ${q.pergunta}\nObjetivo: ${q.objetivo}`,
    })
  }

  if (chunks.length === 0) return

  // Gera todos embeddings em batch
  const vectors = await embedBatch(chunks.map(c => c.content))

  // Deleta embeddings antigos do mesmo diagnóstico
  await supabase
    .from('diagnostic_embeddings')
    .delete()
    .eq('diagnostic_id', diagnosticId)

  // Insere novos
  const rows = chunks.map((c, i) => ({
    diagnostic_id: diagnosticId,
    chunk_type:    c.chunk_type,
    content:       c.content,
    embedding:     JSON.stringify(vectors[i]),  // Supabase aceita array como string JSON
  }))

  await supabase.from('diagnostic_embeddings').insert(rows)
}
