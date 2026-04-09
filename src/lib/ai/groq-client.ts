/**
 * QUANTUM5G — Groq Client
 * Wrapper sobre groq-sdk para geração de relatório e chat.
 */

import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  }
  return _groq
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile'

// Temperatura conservadora para relatórios estruturados
export const REPORT_TEMPERATURE  = 0.4
export const CHAT_TEMPERATURE    = 0.6
