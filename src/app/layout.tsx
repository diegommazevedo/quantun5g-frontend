import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeInitScript } from "@/components/theme/ThemeInit";
import { AuthHashHandler } from "@/components/auth/AuthHashHandler";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  // Preload gera warning no Chrome quando o RSC demora ou em soft nav (link duplicado).
  // A fonte continua self-hosted via className abaixo.
  preload: false,
});

export const metadata: Metadata = {
  title: "Quantum5G | Pentagrama de Ginger",
  description: "Diagnóstico organizacional — Pentagrama de Ginger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.className} ${inter.variable} h-full antialiased`}
      data-theme="quantum-dark"
      suppressHydrationWarning
    >
      <body className="min-h-full q-page-bg">
        <ThemeInitScript />
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
