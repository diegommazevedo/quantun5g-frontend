import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['recharts', 'groq-sdk', 'openai'],
  },
  /** Evita 404 em bookmarks / prefetch antigos sem bater na App Route. */
  async redirects() {
    return [
      { source: '/lgpd', destination: '/privacidade', permanent: true },
      { source: '/admin', destination: '/admin/consultores', permanent: false },
      { source: '/admin/', destination: '/admin/consultores', permanent: false },
      { source: '/dashboard/admin', destination: '/admin/consultores', permanent: false },
    ]
  },
  /**
   * P021 — extensão futura para rewrites por subdomínio.
   *
   * A arquitetura dual usa um único deploy Vercel servindo
   * quantum5g.app + pentagrama.quantum5g.app + nr01.quantum5g.app.
   * Atualmente o gating é 100% feito pelo proxy (src/proxy.ts) e os
   * caminhos das rotas continuam logicamente separados (`/diagnostico`
   * para Pentagrama, `/nr01/dashboard` para NR-01).
   *
   * Quando a equipe decidir uniformizar URLs (ex.: `nr01./dashboard`
   * → `/nr01/dashboard`), adicionar regras aqui usando `has` matcher
   * com `host`. Mantido vazio por ora para evitar acoplamento de URL
   * antes da decisão de produto.
   */
  async rewrites() {
    return []
  },
};

export default nextConfig;
