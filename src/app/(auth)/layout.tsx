/**
 * QUANTUM5G — Layout do grupo (auth)
 * Páginas públicas: /login
 * Fundo dividido: esquerda com identidade visual, direita com formulário.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo — identidade visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 flex-col justify-between p-12">
        <div>
          <span className="text-white text-xl font-semibold tracking-tight">
            Quantum5G
          </span>
        </div>
        <div className="space-y-4">
          <h1 className="text-white text-4xl font-bold leading-tight">
            Pentagrama de Ginger
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed max-w-sm">
            Diagnóstico organizacional de campo em cinco dimensões.
            Instrumento de precisão clínica para líderes e consultores.
          </p>
        </div>
        <div className="text-zinc-600 text-sm">
          © {new Date().getFullYear()} Quantum5G. Todos os direitos reservados.
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  )
}
