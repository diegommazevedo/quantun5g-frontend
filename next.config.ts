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
   * P021 — rewrites por subdomínio (UX limpa de URL).
   *
   * Para NR-01 (`nr01.quantun5g.app`), rewrita os paths visíveis ao
   * usuário (`/dashboard`, `/avaliacao/...`, etc.) para os paths reais
   * do app (`/nr01/dashboard`, `/nr01/avaliacao/...`).
   *
   * Para Pentagrama (`pentagrama.quantun5g.app`), os paths reais já
   * vivem na raiz (`/dashboard`, `/diagnostico/...`) — sem rewrite.
   *
   * Importante:
   *   - Rewrites NÃO se aplicam a paths compartilhados do shell
   *     (`/checkout`, `/paywall`, `/login`, `/institucional`,
   *     `/api/billing`, `/api/auth`) porque os `source` abaixo são
   *     explícitos e não casam com esses prefixos.
   *   - O proxy (src/proxy.ts) faz o gating por assinatura ANTES do
   *     rewrite, então a verificação acontece no path original visto
   *     pelo browser.
   *   - Em dev (localhost), rewrites não disparam porque `has: host`
   *     exige hostname literal — usar `/nr01/...` direto em dev.
   */
  async rewrites() {
    const NR01_HOST = 'nr01.quantun5g.app'
    return [
      {
        source: '/dashboard',
        has: [{ type: 'host', value: NR01_HOST }],
        destination: '/nr01/dashboard',
      },
      {
        source: '/avaliacao/:path*',
        has: [{ type: 'host', value: NR01_HOST }],
        destination: '/nr01/avaliacao/:path*',
      },
      {
        source: '/coleta/:path*',
        has: [{ type: 'host', value: NR01_HOST }],
        destination: '/nr01/coleta/:path*',
      },
      {
        source: '/status/:path*',
        has: [{ type: 'host', value: NR01_HOST }],
        destination: '/nr01/status/:path*',
      },
    ]
  },
};

export default nextConfig;
