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
  async redirects() {
    return [{ source: "/lgpd", destination: "/privacidade", permanent: true }];
  },
};

export default nextConfig;
