import { StaffShell } from '@/components/navigation/StaffShell'

export default function RelatorioLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell contentMaxWidth="max-w-5xl">
      {children}
    </StaffShell>
  )
}
