/**
 * NR-01 — Lançamento do Chromium para geração de PDF (Playwright).
 * Produção: @sparticuz/chromium-min. Dev: Chrome/Edge do sistema ou Playwright cache.
 */

import { existsSync } from 'fs'

const WIN_CHROME_PATHS = [
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
]

const UNIX_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
]

function resolveLocalExecutable(): string | undefined {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH?.trim()
  if (fromEnv && existsSync(fromEnv)) return fromEnv

  const candidates = process.platform === 'win32' ? WIN_CHROME_PATHS : UNIX_CHROME_PATHS
  for (const p of candidates) {
    if (p && existsSync(p)) return p
  }
  return undefined
}

export async function launchPdfBrowser() {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_EXECUTION_ENV

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { chromium: pwChromium } = (await import('playwright-core')) as any

  if (isServerless) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sparticuz: any = await import('@sparticuz/chromium-min')
    const chromiumLib = sparticuz.default ?? sparticuz
    const remoteUrl =
      process.env.NR01_CHROMIUM_PACK_URL ??
      'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
    const executablePath = await chromiumLib.executablePath(remoteUrl)
    return pwChromium.launch({
      args: chromiumLib.args,
      executablePath,
      headless: true,
    })
  }

  const localPath = resolveLocalExecutable()
  return pwChromium.launch({
    headless: true,
    ...(localPath ? { executablePath: localPath } : {}),
  })
}
