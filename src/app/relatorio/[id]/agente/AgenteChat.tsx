'use client'

/**
 * QUANTUM5G — AgenteChat
 * Interface de chat com o agente IA — chips inteligentes + relatório expandido.
 */

import { useState, useRef, useEffect } from 'react'
import type { ChipCategory } from '@/lib/ai/smart-chips'

interface Message { role: 'user' | 'assistant'; content: string }

interface Props {
  diagnosticId:    string
  initialMessages: Message[]
  smartChips:      ChipCategory[]
  chatCount:       number  // total de mensagens no histórico
}

export function AgenteChat({ diagnosticId, initialMessages, smartChips, chatCount }: Props) {
  const [messages,  setMessages]  = useState<Message[]>(initialMessages)
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [expanding, setExpanding] = useState(false)
  const [expandMsg, setExpandMsg] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Conta mensagens do usuário (para habilitar botão de relatório expandido)
  const userMsgCount = messages.filter(m => m.role === 'user').length + Math.floor(chatCount / 2)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showChips = input.trim() === '' && !loading && messages.length === 0

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    setInput('')
    setLoading(true)

    const userMsg: Message = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMsg])
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
          content: `Erro ao conectar com o agente: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
        }
        return next
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleGenerateExpanded() {
    if (expanding) return
    if (!confirm('Gerar relatório expandido com base nesta conversa? Pode levar 30-60 segundos.')) return

    setExpanding(true)
    setExpandMsg(null)

    try {
      const resp = await fetch(`/api/ai/generate-expanded/${diagnosticId}`, { method: 'POST' })
      const data = await resp.json() as { success?: boolean; error?: string }

      if (!resp.ok || !data.success) {
        setExpandMsg(data.error ?? 'Erro ao gerar relatório expandido.')
        return
      }

      setExpandMsg('Relatório expandido gerado! Redirecionando...')
      setTimeout(() => {
        window.location.href = `/relatorio/${diagnosticId}`
      }, 1500)
    } catch (err) {
      setExpandMsg(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally {
      setExpanding(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const canExpand = userMsgCount >= 3

  return (
    <div className="flex flex-col h-full">
      {/* ── Histórico ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">&#x1F9E0;</p>
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
                  <span className="animate-pulse">&#x25CF;</span>
                  <span className="animate-pulse delay-100">&#x25CF;</span>
                  <span className="animate-pulse delay-200">&#x25CF;</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Chips inteligentes ────────────────────────────── */}
      {showChips && smartChips.length > 0 && (
        <div className="px-4 pb-2 space-y-2">
          {smartChips.map(category => (
            <div key={category.title}>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                {category.title}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.chips.map(chip => (
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

      {/* ── Gerar Relatório Expandido ─────────────────────── */}
      {canExpand && !loading && (
        <div className="px-4 pb-2">
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-purple-900">
                Conversa suficiente para expandir o relatório
              </p>
              <p className="text-xs text-purple-600 mt-0.5 truncate">
                {expandMsg ?? 'Gere uma versão aprofundada com insights desta conversa.'}
              </p>
            </div>
            <button
              onClick={handleGenerateExpanded}
              disabled={expanding}
              className="shrink-0 rounded-lg bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-50 transition-colors"
            >
              {expanding ? 'Gerando...' : 'Gerar Expandido'}
            </button>
          </div>
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
            placeholder="Pergunte sobre o diagn&#243;stico... (Enter para enviar)"
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-40 transition-colors"
          >
            {loading ? '...' : '\u2192'}
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-1.5 text-center">
          Shift+Enter para quebra de linha · Enter para enviar
        </p>
      </div>
    </div>
  )
}
