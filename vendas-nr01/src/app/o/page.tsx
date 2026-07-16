import { redirect } from 'next/navigation'

/** Atalho WhatsApp: /o → Operacional */
export default function ShortOperacionalPage() {
  redirect('/plano/operacional')
}
