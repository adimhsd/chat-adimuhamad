-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table untuk menyimpan text chunks dengan embeddings
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes untuk performance
CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Chat history table (optional, untuk track conversation)
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_message TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  message_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- Metadata table untuk track ingestion
CREATE TABLE IF NOT EXISTS ingest_metadata (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255),
  source VARCHAR(255),
  total_chunks INTEGER,
  text_length INTEGER,
  embedding_model VARCHAR(100),
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant proper permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${POSTGRES_USER:-postgres};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${POSTGRES_USER:-postgres};
