import Link from 'next/link'
import { LP_CONTENT_ITEMS } from '@/constants/lp-nr01'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export function ContentLibrary() {
  const items = LP_CONTENT_ITEMS.filter((i) => i.available)
  if (items.length === 0) return null

  return (
    <section className="px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Biblioteca de conteúdo</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm opacity-90">
          Materiais complementares liberados conforme campanha — só aparecem aqui quando marcados como disponíveis.
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-white/10 p-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <h3 className="text-lg font-semibold" style={{ color: ACCENT }}>
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed opacity-90">{item.description}</p>
              {item.href ? (
                <Link
                  href={item.href}
                  className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                  style={{ color: ACCENT }}
                >
                  Aceder
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
