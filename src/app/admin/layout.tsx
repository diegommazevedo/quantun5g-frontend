import { StaffShell } from '@/components/navigation/StaffShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell contentMaxWidth="max-w-7xl" requireAdmin>
      {children}
    </StaffShell>
  )
}
