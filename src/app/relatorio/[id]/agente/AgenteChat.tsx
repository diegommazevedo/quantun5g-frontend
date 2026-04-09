'use client'

/**
 * QUANTUM5G — AgenteChat
 * Interface de chat com o agente IA.
 * Chips de prompts pré-tokenizados + input livre + streaming SSE.
 */

import { useState, useRef, useEffect } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

const CHIPS: Record<string, { label: string; prompt: string }[]> = {
  'Aprofundamento': [
    { label: 'Dimensão mais crítica',         prompt: 'Aprofunde a análise da dimensão mais crítica' },
    { label: 'Questões âncora',               prompt: 'Quais questões âncora merecem atenção imediata?' },
    { label: 'Padrão sistêmico',              prompt: 'Explique o padrão sistêmico encontrado entre as dimensões' },
    { label: 'O gap de percepção',            prompt: 'O que o gap de percepção revela sobre esta liderança?' },
  ],
  'Plano de ação': [
    { label: '30/60/90 dias',                 prompt: 'Monte um plano de 30/60/90 dias para esta empresa' },
    { label: 'Primeira ação',                 prompt: 'Qual a primeira ação que o líder deve tomar amanhã?' },
    { label: 'Prioridade das ferramentas',    prompt: 'Priorize as ferramentas por impacto e facilidade de implementação' },
    { label: 'Resistência ao plano',          prompt: 'O que fazer se a liderança resistir ao plano?' },
  ],
  'Devolutiva': [
    { label: 'Sem assustar o cliente',        prompt: 'Como apresentar os resultados sem assustar o cliente?' },
    { label: 'Abertura da reunião',           prompt: 'Sugira como abrir a reunião de devolutiva' },
    { label: 'Resistência da liderança',      prompt: 'Como lidar com resistência da liderança aos resultados?' },
    { label: 'Ordem das dimensões',           prompt: 'Qual dimensão apresentar primeiro e por quê?' },
  ],
  'Prescrição': [
    { label: 'Ferramenta mais urgente',       prompt: 'Explique como aplicar a ferramenta prescrita mais urgente' },
    { label: 'Sequência em 90 dias',          prompt: 'Como sequenciar as ferramentas ao longo de 90 dias?' },
    { label: 'Próxima pesquisa',              prompt: 'Sugira a próxima pesquisa após este diagnóstico' },
    { label: 'Como conectar ferramentas',     prompt: 'Como as ferramentas se conectam entre si neste diagnóstico?' },
  ],
}

interface Props {
  diagnosticId:   string
  initialMessages: Message[]
}

export function AgenteChat({ diagnosticId, initialMessages }: Props) {
  const [messages,  setMessages]  = useState<Message[]>(initialMessages)
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showChips = input.trim() === '' && !loading

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])

    // Placeholder da resposta
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const resp = await fetch(`/api/ai/chat/${diagnosticId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text.trim() }),
      })

      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const { delta } = JSON.parse(data) as { delta: string }
            setMessages(prev => {
              const next = [...prev]
              next[next.length - 1] = {
                role:    'assistant',
                content: (next[next.length - 1]?.content ?? '') + delta,
              }
              return next
            })
          } catch { /* ignora chunks malformados */ }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content: `⚠️ Erro ao conectar com o agente: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
        }
        return next
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Histórico ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🧠</p>
            <p className="text-zinc-600 font-medium">Agente IA — Pentagrama de Ginger</p>
            <p className="text-zinc-400 text-sm mt-1">Selecione um chip abaixo ou escreva sua pergunta</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-zinc-900 text-white rounded-br-sm'
                : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'
            }`}>
              {m.content || (
                <span className="flex gap-1 items-center text-zinc-400">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse delay-100">●</span>
                  <span className="animate-pulse delay-200">●</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Chips ─────────────────────────────────────────── */}
      {showChips && (
        <div className="px-4 pb-2 space-y-2">
          {Object.entries(CHIPS).map(([category, chips]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                {category}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {chips.map(chip => (
                  <button
                    key={chip.prompt}
                    onClick={() => sendMessage(chip.prompt)}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Input ─────────────────────────────────────────── */}
      <div className="border-t border-zinc-200 bg-white px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre o diagnóstico… (Enter para enviar)"
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-40 transition-colors"
          >
            {loading ? '…' : '→'}
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5 text-center">
          Shift+Enter para quebra de linha · Enter para enviar
        </p>
      </div>
    </div>
  )
}
