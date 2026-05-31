import { StaffShell } from '@/components/navigation/StaffShell'

export default function Nr01Layout({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell contentMaxWidth="max-w-6xl" requireModuleNr01>
      {children}
    </StaffShell>
  )
}
