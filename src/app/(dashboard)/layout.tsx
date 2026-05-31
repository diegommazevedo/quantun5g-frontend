import { StaffShell } from '@/components/navigation/StaffShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell contentMaxWidth="max-w-5xl" showAgent>
      {children}
    </StaffShell>
  )
}
