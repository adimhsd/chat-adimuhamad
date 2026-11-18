import { createOpenAI } from '@ai-sdk/openai';
import { searchDocumentsByEmbedding } from './postgres';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const EMBEDDING_MODEL =
  process.env.NEXT_PUBLIC_EMBEDDING_MODEL || 'text-embedding-3-small';

/**
 * Memecah teks panjang menjadi potongan (chunks) dengan overlap agar konteks tetap terjaga.
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const safeSize = Math.max(200, Math.min(4000, Math.floor(chunkSize) || 1000));
  const safeOverlap = Math.max(0, Math.min(safeSize - 50, Math.floor(overlap) || 0));
  const step = Math.max(1, safeSize - safeOverlap);

  const chunks: string[] = [];
  for (let i = 0; i < normalized.length; i += step) {
    const slice = normalized.substring(i, i + safeSize).trim();
    if (slice) {
      chunks.push(slice);
    }
    if (i + safeSize >= normalized.length) {
      break;
    }
  }
  return chunks;
}

/**
 * Generate embedding untuk text menggunakan OpenAI's text-embedding-3-small (1536 dimensi).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embedding(EMBEDDING_MODEL).doEmbed({
    values: [text],
  });

  if (!response.embeddings?.[0]) {
    throw new Error('Failed to generate embedding');
  }

  return response.embeddings[0];
}

/**
 * RAG: Retrieve relevant documents dari database berdasarkan query.
 */
export async function retrieveRelevantDocuments(
  userQuery: string,
  topK: number = 5
): Promise<
  Array<{
    id: number;
    content: string;
    source: string;
    similarity?: number;
  }>
> {
  try {
    const queryEmbedding = await generateEmbedding(userQuery);
    const results = await searchDocumentsByEmbedding(queryEmbedding, topK);

    return results.map((doc) => ({
      id: doc.id,
      content: doc.content,
      source: doc.source,
      similarity: doc.similarity,
    }));
  } catch (error) {
    console.error('Error retrieving documents:', error);
    return [];
  }
}

/**
 * Build context from retrieved documents for the LLM prompt.
 */
export function buildRAGContext(
  documents: Array<{ id: number; content: string; source: string; similarity?: number }>
): string {
  if (documents.length === 0) {
    return 'Tidak ada dokumen relevan ditemukan.';
  }

  return documents
    .map(
      (doc, index) =>
        `Dokumen ${index + 1} (Sumber: ${doc.source}):\n${doc.content}`
    )
    .join('\n\n---\n\n');
}
