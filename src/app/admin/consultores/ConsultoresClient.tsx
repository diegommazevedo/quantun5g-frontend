'use client'

/**
 * QUANTUM5G — ConsultoresClient
 * Gerencia estado do modal "Novo consultor" e confirmação de toggle ativo.
 */

import { useState, useTransition } from 'react'
import { criarConsultor, toggleAtivo } from './actions'

interface Consultor {
  id: string
  name: string | null
  email: string | null
  is_active: boolean
  created_at: string
  n_diagnosticos: number
}

interface Props {
  consultores: Consultor[]
}

export function ConsultoresClient({ consultores }: Props) {
  const [modalOpen, setModalOpen]   = useState(false)
  const [erro, setErro]             = useState<string | null>(null)
  const [sucesso, setSucesso]       = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setSucesso(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await criarConsultor(fd)
      if ('error' in res) {
        setErro(res.error ?? 'Erro desconhecido')
      } else {
        setSucesso(`Convite enviado para ${res.name ?? 'consultor'}!`)
        setModalOpen(false)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  async function handleToggle(id: string, ativoAtual: boolean) {
    const novoEstado = !ativoAtual
    const acao = novoEstado ? 'ativar' : 'desativar'
    if (!confirm(`Deseja ${acao} este consultor?`)) return
    startTransition(async () => {
      const res = await toggleAtivo(id, novoEstado)
      if ('error' in res) setErro(res.error ?? 'Erro desconhecido')
    })
  }

  return (
    <>
      {/* Feedback global */}
      {sucesso && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex justify-between">
          {sucesso}
          <button onClick={() => setSucesso(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex justify-between">
          {erro}
          <button onClick={() => setErro(null)} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Header da seção */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Consultores</h1>
        <button
          onClick={() => { setModalOpen(true); setErro(null) }}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
        >
          + Novo consultor
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
        {consultores.length === 0 ? (
          <div className="px-6 py-12 text-center text-zinc-400">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">Nenhum consultor cadastrado ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nome</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">E-mail</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Diagnósticos</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Cadastro</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {consultores.map(c => (
                <tr key={c.id} className={`hover:bg-zinc-50 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5 font-medium text-zinc-900">
                    {c.name ?? <span className="text-zinc-400 italic">sem nome</span>}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 font-mono text-xs">{c.email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-center tabular-nums text-zinc-700">
                    {c.n_diagnosticos > 0
                      ? <span className="font-medium">{c.n_diagnosticos}</span>
                      : <span className="text-zinc-300">0</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-center text-zinc-500 text-xs">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {c.is_active
                      ? <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Ativo</span>
                      : <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-500">Inativo</span>
                    }
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggle(c.id, c.is_active)}
                      disabled={isPending}
                      className={`text-xs font-medium transition-colors ${
                        c.is_active
                          ? 'text-red-600 hover:text-red-800'
                          : 'text-green-600 hover:text-green-800'
                      } disabled:opacity-40`}
                    >
                      {c.is_active ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Novo consultor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900">Novo consultor</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 transition-colors text-xl leading-none"
              >✕</button>
            </div>

            <form onSubmit={handleCriar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Nome completo
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ex: Ana Paula Costa"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  E-mail profissional
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="consultor@empresa.com"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                📧 Um e-mail de boas-vindas será enviado com o link de primeiro acesso.
                O consultor define a própria senha ao aceitar o convite.
              </div>

              {erro && (
                <p className="text-sm text-red-600">{erro}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Enviando...' : 'Enviar convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
