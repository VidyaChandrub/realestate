import { config } from 'dotenv';
config();

export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small';
export const OPENAI_EMBEDDING_URL =
  process.env.OPENAI_EMBEDDING_URL ?? 'https://api.openai.com/v1/embeddings';

export function getOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embedding generation');
  }
  return apiKey;
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}

export function getEmbeddingUrl(): string {
  return OPENAI_EMBEDDING_URL;
}
