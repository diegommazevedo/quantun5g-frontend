/**
 * Política de prefetch do Next.js Link no app autenticado.
 *
 * prefetch=true (default em prod) dispara RSC em background para cada link visível.
 * Em rotas pesadas (dashboard, abas de avaliação, grade de empresas) isso gera
 * dezenas de requests competindo com a navegação do usuário.
 *
 * Efeito colateral aceito: o 1º clique espera o RSC completo (já era ~300ms–1s);
 * ganho: página atual carrega mais rápido e menos carga na Vercel.
 */
export const STAFF_LINK_PREFETCH = false as const

export const staffLinkProps = { prefetch: STAFF_LINK_PREFETCH } as const
