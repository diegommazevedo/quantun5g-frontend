/**
 * Apex quantun5g.app — entrada do SaaS (login ou painel).
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Quantum5G · Plataforma',
  description: 'Acesso à plataforma Quantum5G — Pentagrama de Ginger e NR-01.',
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')
  redirect('/login')
}
