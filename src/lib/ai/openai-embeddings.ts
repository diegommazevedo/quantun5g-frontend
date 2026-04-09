/**
 * QUANTUM5G — OpenAI Embeddings
 * text-embedding-3-small (1536 dims) para busca semântica via pgvector.
 */

import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  }
  return _openai
}

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMS  = 1536

/**
 * Gera embedding para um texto.
 */
export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAI()
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // limite de segurança
    dimensions: EMBEDDING_DIMS,
  })
  return resp.data[0].embedding
}

/**
 * Gera embeddings para múltiplos textos em batch.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI()
  const resp = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map(t => t.slice(0, 8000)),
    dimensions: EMBEDDING_DIMS,
  })
  return resp.data.map(d => d.embedding)
}
