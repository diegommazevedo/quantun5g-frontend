'use client'

import Image from 'next/image'
import { JOVANE_CRP_LABEL } from '@/constants/lp-nr01'
import { useState } from 'react'

const LIGHT = '#F5F1EA'
const DARK = '#0B1A2F'
const ACCENT = '#B8945A'

const quote =
  'Diagnóstico sem vivência organizacional vira etiqueta. Por isso o Pentagrama conversa com a NR-01 quando vocês escolhem o bridge — regulatório e humano no mesmo plano.'

export function JovaneManifesto() {
  const [imgError, setImgError] = useState(false)

  return (
    <section className="px-4 py-16 sm:py-20" style={{ backgroundColor: LIGHT, color: DARK }}>
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
        <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-zinc-200 shadow-lg md:mx-0">
          {!imgError ? (
            <Image
              src="/jovane.png"
              alt="Jovane Borlini da Silva"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center p-6 text-center text-sm text-zinc-600">
              <p className="font-medium">Fotografia oficial pendente</p>
              <p className="mt-2">Coloque o ficheiro em public/jovane.png (retrato ~4:5).</p>
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
            Autor do método
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Jovane Borlini da Silva</h2>
          <p className="mt-1 text-sm text-zinc-600">{JOVANE_CRP_LABEL}</p>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-zinc-800">
            <p>
              Eu desenhei o Pentagrama de Ginger para traduzir o vivido organizacional em dimensões mensuráveis — com
              respeito absoluto ao anonimato de quem responde no campo.
            </p>
            <p>
              A NR-01 exige outra linguagem: risco psicossocial, evidência e auditoria. A Quantum5G une os dois mundos
              quando a liderança precisa de um único plano de ação coerente.
            </p>
          </div>
          <figure
            className="mt-8 rounded-xl px-5 py-4 text-sm leading-relaxed text-[#F5F1EA] sm:text-base"
            style={{ backgroundColor: DARK }}
          >
            <blockquote className="border-l-4 pl-4 italic" style={{ borderColor: ACCENT }}>
              “{quote}”
            </blockquote>
            <figcaption className="mt-3 text-right text-xs opacity-80">— Jovane Borlini da Silva</figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
