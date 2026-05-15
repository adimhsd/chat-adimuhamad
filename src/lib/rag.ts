import { createOpenAI } from '@ai-sdk/openai';
import { searchDocumentsByEmbedding } from './postgres';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding untuk text menggunakan OpenAI's text-embedding-3-small
 * (Paling murah: $0.02 per 1M tokens)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embedding('text-embedding-3-small').doEmbed({
    values: [text],
  });

  if (!response.embeddings?.[0]) {
    throw new Error('Failed to generate embedding');
  }

  return response.embeddings[0];
}

/**
 * RAG: Retrieve relevant documents dari database berdasarkan query
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
    // Generate embedding untuk query
    const queryEmbedding = await generateEmbedding(userQuery);
    
    // Search similar documents dari PostgreSQL
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
 * Build context from retrieved documents for the LLM prompt
 */
export function buildRAGContext(
  documents: Array<{ id: number; content: string; source: string; similarity?: number }>
): string {
  if (documents.length === 0) {
    return 'Tidak ada dokumen relevan ditemukan.';
  }

  const context = documents
    .map(
      (doc, index) =>
        `Dokumen ${index + 1} (Sumber: ${doc.source}):\n${doc.content}`
    )
    .join('\n\n---\n\n');

  return context;
}
