/**
 * Opções compartilhadas dos clientes Supabase.
 * Em dev, retry leve no fetch — projeto recém-despausado pode demorar a aceitar TCP.
 */

const isDev = process.env.NODE_ENV === 'development'

async function fetchWithDevRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const attempts = isDev ? 3 : 1
  let last: unknown

  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(input, init)
    } catch (err) {
      last = err
      if (i < attempts) {
        await new Promise((r) => setTimeout(r, i * 1500))
      }
    }
  }

  throw last
}

export const supabaseClientOptions = {
  global: {
    fetch: fetchWithDevRetry,
  },
} as const
