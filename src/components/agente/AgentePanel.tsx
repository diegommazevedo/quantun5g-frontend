'use client'

/**
 * QUANTUM5G — AgentePanel
 * Painel lateral direito do agente IA.
 * Minimizado: 48px (ícone). Expandido: 380px com chat completo.
 * Contexto detectado automaticamente por pathname.
 */

import { useState, useEffect, useRef } from 'react'
import { useAgenteContext }             from '@/hooks/useAgenteContext'

interface Message {
  role:    'user' | 'assistant'
  content: string
}

const STORAGE_EXPANDED = 'agente_expanded'
const MAX_HISTORY      = 50

export function AgentePanel() {
  const [expanded,  setExpanded]  = useState(false)
  const [mounted,   setMounted]   = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const context   = useAgenteContext()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  const historyKey = `agente_history_${context.type}_${context.diagnosticId ?? 'global'}`

  // Hidratação: lê localStorage só no client
  useEffect(() => {
    setMounted(true)
    setExpanded(localStorage.getItem(STORAGE_EXPANDED) === 'true')
  }, [])

  // Troca de contexto → carrega histórico desse contexto
  useEffect(() => {
    if (!mounted) return
    try {
      const saved = localStorage.getItem(historyKey)
      setMessages(saved ? JSON.parse(saved) : [])
    } catch { setMessages([]) }
  }, [historyKey, mounted])

  // Persiste mensagens
  useEffect(() => {
    if (!mounted || messages.length === 0) return
    localStorage.setItem(historyKey, JSON.stringify(messages.slice(-MAX_HISTORY)))
  }, [messages, historyKey, mounted])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem(STORAGE_EXPANDED, String(next))
    if (next) setTimeout(() => inputRef.current?.focus(), 350)
  }

  // Auto-resize do textarea
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLoading(true)

    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])

    try {
      const resp = await fetch('/api/agente/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: text.trim(),
          history: [...messages, userMsg].filter(m => m.role !== 'assistant' || m.content).slice(-20),
          context: {
            type:         context.type,
            diagnosticId: context.diagnosticId,
            systemHint:   context.systemHint,
          },
        }),
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

      // Detecta fluxo de criação de diagnóstico
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content.includes('[CRIAR_DIAGNOSTICO:')) {
          const match = last.content.match(/\[CRIAR_DIAGNOSTICO:\s*(\{[^}]+\})\]/)
          if (match) {
            try {
              const payload = JSON.parse(match[1]) as Record<string, unknown>
              const clean   = last.content.replace(/\[CRIAR_DIAGNOSTICO:[^\]]+\]/, '').trim()
              handleCreateDiagnostic(payload)
              return [...prev.slice(0, -1), { role: 'assistant', content: clean }]
            } catch { /* JSON inválido — ignora */ }
          }
        }
        return prev
      })

    } catch (err) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = {
          role:    'assistant',
          content: `⚠️ Erro: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
        }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateDiagnostic(data: Record<string, unknown>) {
    try {
      const resp = await fetch('/api/agente/create-diagnostic', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      const result = await resp.json() as {
        diagnosticId?: string
        il_url?:       string
        ic_url?:       string
        error?:        string
      }

      if (result.error) {
        setMessages(prev => [...prev, {
          role:    'assistant',
          content: `⚠️ Não consegui criar o diagnóstico: ${result.error}`,
        }])
      } else {
        const base = window.location.origin
        setMessages(prev => [...prev, {
          role:    'assistant',
          content: `✅ Diagnóstico criado!\n\nLink do líder (IL):\n${base}/il/${result.il_url}\n\nLink dos colaboradores (IC):\n${base}/ic/${result.ic_url}\n\nAcesse o Dashboard para acompanhar a coleta.`,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: '⚠️ Erro ao criar o diagnóstico. Tente pelo painel em /dashboard.',
      }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const showChips = input.trim() === '' && !loading

  // Evita flash de hidratação
  if (!mounted) return <div className="w-12 border-l border-zinc-200 bg-white shrink-0" />

  return (
    <div
      className={`
        relative flex flex-col border-l border-zinc-200 bg-white shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${expanded ? 'w-[380px]' : 'w-12'}
      `}
    >
      {/* ── MINIMIZADO ──────────────────────────────────────── */}
      {!expanded && (
        <button
          onClick={toggleExpanded}
          title="Agente IA — clique para expandir"
          className="absolute inset-0 flex flex-col items-center pt-4 gap-1 hover:bg-purple-50 transition-colors group"
        >
          <span className="text-xl">✨</span>
          <span
            className="
              text-[9px] font-semibold text-zinc-400 group-hover:text-purple-600
              [writing-mode:vertical-rl] rotate-180 mt-2 tracking-widest uppercase
            "
          >
            Agente
          </span>
        </button>
      )}

      {/* ── EXPANDIDO ───────────────────────────────────────── */}
      {expanded && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">✨</span>
              <span className="text-sm font-semibold text-zinc-800 leading-none">Agente IA</span>
              <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" title="Online" />
            </div>
            <button
              onClick={toggleExpanded}
              className="text-zinc-400 hover:text-zinc-700 transition-colors rounded p-1 hover:bg-zinc-100"
              title="Minimizar"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Badge de contexto */}
          {context.type !== 'general' && (
            <div className="px-4 py-1.5 bg-purple-50 border-b border-purple-100 shrink-0">
              <p className="text-[11px] text-purple-700 font-medium leading-none">
                {context.type === 'report'     && '📊 Contexto: relatório ativo'}
                {context.type === 'diagnostic' && '📋 Contexto: diagnóstico ativo'}
                {context.type === 'dashboard'  && '🗂️ Contexto: dashboard'}
              </p>
            </div>
          )}

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">🧠</p>
                <p className="text-zinc-600 text-sm font-medium">Agente Pentagrama de Ginger</p>
                <p className="text-zinc-400 text-xs mt-1">Selecione um chip ou escreva sua pergunta</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`
                    max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap
                    ${m.role === 'user'
                      ? 'bg-zinc-900 text-white rounded-br-sm'
                      : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'}
                  `}
                >
                  {m.content || (
                    <span className="flex gap-1 items-center text-zinc-400">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse" style={{ animationDelay: '150ms' }}>●</span>
                      <span className="animate-pulse" style={{ animationDelay: '300ms' }}>●</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Chips */}
          {showChips && (
            <div className="px-4 pb-2 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {context.chips.map(chip => (
                  <button
                    key={chip.prompt}
                    onClick={() => sendMessage(chip.prompt)}
                    className="
                      rounded-full border border-zinc-200 bg-white
                      px-3 py-1.5 text-[11px] text-zinc-700
                      hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700
                      transition-colors
                    "
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-zinc-200 bg-white px-3 py-3 shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte… (Enter para enviar)"
                disabled={loading}
                rows={1}
                className="
                  flex-1 resize-none overflow-hidden rounded-xl
                  border border-zinc-200 bg-zinc-50 px-3 py-2
                  text-xs text-zinc-800 placeholder:text-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
                  disabled:opacity-50
                "
                style={{ minHeight: '36px', maxHeight: '200px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="
                  shrink-0 rounded-xl bg-purple-700 px-3 py-2
                  text-xs font-bold text-white
                  hover:bg-purple-800 disabled:opacity-40 transition-colors
                "
              >
                {loading ? '…' : '→'}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 text-center">
              Shift+Enter para quebra · Enter para enviar
            </p>
          </div>
        </>
      )}
    </div>
  )
}
