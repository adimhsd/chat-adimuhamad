import { Pool, QueryResult, QueryResultRow } from 'pg';

// Create connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'chatbot_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a query and return results
 */
async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}



/**
 * Search documents by embedding similarity (RAG retrieval)
 * Returns top K most similar documents
 */
export async function searchDocumentsByEmbedding(
  embedding: number[],
  topK: number = 5
) {
  const text = `
    SELECT 
      id,
      content,
      source,
      chunk_index,
      metadata,
      (1 - (embedding <=> $1)) AS similarity
    FROM documents
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1
    LIMIT $2;
  `;
  const result = await query<{
    id: number;
    content: string;
    source: string;
    chunk_index: number;
    metadata: Record<string, any>;
    similarity: number;
  }>(text, [JSON.stringify(embedding), topK]);
  return result.rows;
}



/**
 * Save chat history
 */
export async function saveChatHistory(
  userMessage: string,
  assistantMessage: string,
  tokens?: { message: number; completion: number }
) {
  const text = `
    INSERT INTO chat_history (user_message, assistant_message, message_tokens, completion_tokens, total_tokens)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  const result = await query<{ id: number }>(text, [
    userMessage,
    assistantMessage,
    tokens?.message || 0,
    tokens?.completion || 0,
    (tokens?.message || 0) + (tokens?.completion || 0),
  ]);
  return result.rows[0];
}



/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW();');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

