import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeInitScript } from "@/components/theme/ThemeInit";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} data-theme="quantum-dark" suppressHydrationWarning>
      <body className="min-h-full q-page-bg font-sans">
        <ThemeInitScript />
        {children}
      </body>
    </html>
  );
}
