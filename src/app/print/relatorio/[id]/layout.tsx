/** Layout sem StaffShell — só o documento para PDF. */
import { ForceLightTheme } from './ForceLightTheme'

export default function PrintRelatorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <ForceLightTheme />
      {children}
    </div>
  )
}
