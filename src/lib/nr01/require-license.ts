/**
 * Licença NR-01: todo usuário autenticado com perfil pode criar/usar o módulo.
 * Mantido como ponto único de gate para não espalhar checks de assinatura.
 */
export async function requireNr01LicenseOrRedirect(_params: {
  userId: string
  role: string
  moduleNr01?: boolean
  redirectTo?: string
}): Promise<{ licensed: boolean }> {
  return { licensed: true }
}
