/**
 * QUANTUM5G — PentagramaVisual
 * Radar SVG estático (sem Recharts) — estável na tela e no PDF.
 * Quando não há IL, desenha só o IC.
 */

interface Props {
  ic_fisica_pct: number | null
  ic_afetiva_pct: number | null
  ic_racional_pct: number | null
  ic_social_pct: number | null
  ic_cultural_pct: number | null
  il_fisica_pct: number | null
  il_afetiva_pct: number | null
  il_racional_pct: number | null
  il_social_pct: number | null
  il_cultural_pct: number | null
}

const LABELS = ['Física', 'Afetiva', 'Racional', 'Social', 'Cultural'] as const
const CX = 200
const CY = 190
const R = 130

function pct(v: number | null) {
  if (v === null || Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, v)) / 100
}

/** Ângulo: topo = Física (−90°), sentido horário. */
function point(i: number, n: number, radius: number) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  }
}

function polygon(values: number[], radius: number) {
  return values
    .map((v, i) => {
      const p = point(i, values.length, radius * v)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    })
    .join(' ')
}

function gridRing(level: number) {
  const pts = Array.from({ length: 5 }, (_, i) => point(i, 5, R * level))
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

export function PentagramaVisual(props: Props) {
  const hasIl = [
    props.il_fisica_pct,
    props.il_afetiva_pct,
    props.il_racional_pct,
    props.il_social_pct,
    props.il_cultural_pct,
  ].some((v) => v !== null)

  const ic = [
    pct(props.ic_fisica_pct),
    pct(props.ic_afetiva_pct),
    pct(props.ic_racional_pct),
    pct(props.ic_social_pct),
    pct(props.ic_cultural_pct),
  ]

  const il = hasIl
    ? [
        pct(props.il_fisica_pct),
        pct(props.il_afetiva_pct),
        pct(props.il_racional_pct),
        pct(props.il_social_pct),
        pct(props.il_cultural_pct),
      ]
    : null

  const labelOffset = 22

  return (
    <div data-pentagrama-chart="ready" className="mx-auto w-full max-w-[440px]">
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="auto"
        className="block"
        role="img"
        aria-label="Pentagrama de scores organizacionais"
      >
        {/* Grades */}
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={gridRing(level)}
            fill="none"
            stroke="#e4e4e7"
            strokeWidth={1}
          />
        ))}

        {/* Eixos */}
        {LABELS.map((_, i) => {
          const p = point(i, 5, R)
          return (
            <line
              key={`axis-${i}`}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="#e4e4e7"
              strokeWidth={1}
            />
          )
        })}

        {/* IL (se houver) */}
        {il && (
          <polygon
            points={polygon(il, R)}
            fill="#f97316"
            fillOpacity={0.12}
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        )}

        {/* IC */}
        <polygon
          points={polygon(ic, R)}
          fill="#3b82f6"
          fillOpacity={0.18}
          stroke="#3b82f6"
          strokeWidth={2.5}
        />

        {/* Pontos IC */}
        {ic.map((v, i) => {
          const p = point(i, 5, R * v)
          return <circle key={`ic-${i}`} cx={p.x} cy={p.y} r={3.5} fill="#3b82f6" />
        })}

        {/* Pontos IL */}
        {il &&
          il.map((v, i) => {
            const p = point(i, 5, R * v)
            return <circle key={`il-${i}`} cx={p.x} cy={p.y} r={3.5} fill="#f97316" />
          })}

        {/* Labels */}
        {LABELS.map((label, i) => {
          const p = point(i, 5, R + labelOffset)
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#3f3f46"
              fontSize={13}
              fontWeight={500}
            >
              {label}
            </text>
          )
        })}
      </svg>

      {/* Legenda HTML — nunca escala como SVG de Recharts */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-5 text-sm text-zinc-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 rounded bg-[#3b82f6]" aria-hidden />
          IC — Colaboradores
        </span>
        {hasIl && (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5 rounded bg-[#f97316]"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg,#f97316 0 4px,transparent 4px 7px)' }}
              aria-hidden
            />
            IL — Liderança
          </span>
        )}
      </div>
    </div>
  )
}
