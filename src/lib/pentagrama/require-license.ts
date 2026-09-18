/**
 * Licença Pentagrama: todo usuário autenticado com perfil pode criar/usar o módulo.
 * Mantido como ponto único de gate para não espalhar checks de assinatura.
 */
export async function requirePentagramaLicenseOrRedirect(_params: {
  userId: string
  role: string
  modulePentagrama?: boolean
  redirectTo?: string
}): Promise<{ licensed: boolean }> {
  return { licensed: true }
}
