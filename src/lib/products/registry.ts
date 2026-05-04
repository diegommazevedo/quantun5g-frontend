/**
 * QUANTUM5G — Registry centralizado de produtos da plataforma.
 * Fonte única de verdade para mapeamento subdomain → product → rotas.
 *
 * Este registro é o espelho em código da tabela `products` (P021).
 * Mantenha sincronizado em caso de adição/remoção de produtos.
 */

export type ProductId = 'pentagrama' | 'nr01'

export interface Product {
  id: ProductId
  name: string
  subdomain: string
  description: string
  paywallPath: string
  appPath: string
}

export const PRODUCTS: Record<ProductId, Product> = {
  pentagrama: {
    id: 'pentagrama',
    name: 'Pentagrama de Ginger',
    subdomain: 'pentagrama',
    description: 'Diagnóstico organizacional via método Pentagrama de Ginger.',
    paywallPath: '/paywall/pentagrama',
    appPath: '/diagnostico',
  },
  nr01: {
    id: 'nr01',
    name: 'Quantum5G NR-01',
    subdomain: 'nr01',
    description: 'Avaliação técnica de fatores psicossociais conforme NR-01.',
    paywallPath: '/paywall/nr01',
    // appPath é o que o user vê na URL no subdomínio nr01.
    // O rewrite em next.config.ts traduz para o path real /nr01/dashboard.
    appPath: '/dashboard',
  },
}

export function getProductBySubdomain(subdomain: string): Product | null {
  return Object.values(PRODUCTS).find(p => p.subdomain === subdomain) ?? null
}

export function getProductById(id: string): Product | null {
  return (PRODUCTS as Record<string, Product>)[id] ?? null
}

export function listProducts(): Product[] {
  return Object.values(PRODUCTS)
}
