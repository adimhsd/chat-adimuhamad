#!/usr/bin/env node

/**
 * Blog Assistant - Data Ingestion Script for PostgreSQL
 * Mengkonversi dokumen text menjadi chunks dengan embeddings dan menyimpannya di PostgreSQL
 *
 * Usage:
 *   node ingest-postgres.js --file path/to/file.txt --source "Blog Post 1"
 *   node ingest-postgres.js --dir path/to/documents --source "Blog Posts Collection"
 *   node ingest-postgres.js --url https://example.com/blog.txt --source "External Blog"
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { openai } from '@ai-sdk/openai';
import pkg from 'pg';

const { Pool } = pkg;

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'chatbot_db',
});

/**
 * Split text into chunks dengan overlap untuk context continuity
 */
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Generate embedding menggunakan OpenAI's text-embedding-3-small (paling murah)
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embedding('text-embedding-3-small').doEmbed({
      values: [text],
    });
    return response.embeddings[0];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Read text dari file
 */
async function readTextFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Fetch text dari URL
 */
async function readTextFromURL(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const text = await response.text();
    return text;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
}

/**
 * Read semua text files dari directory
 */
async function readTextFromDirectory(dirPath) {
  let allText = '';
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (file.endsWith('.txt') || file.endsWith('.md')) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          console.log(`Reading file: ${file}`);
          const content = fs.readFileSync(filePath, 'utf-8');
          allText += `\n--- File: ${file} ---\n${content}`;
        }
      }
    }
    return allText;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Insert document chunks ke PostgreSQL dengan embedding
 */
async function insertDocumentsIntoPostgres(
  chunks,
  source,
  fileName = 'imported-document'
) {
  const client = await pool.connect();

  try {
    // Check if source exists dan delete untuk re-ingestion
    const existingCheck = await client.query(
      'SELECT COUNT(*) FROM documents WHERE source = $1',
      [source]
    );

    if (existingCheck.rows[0].count > 0) {
      console.log(`\nDeleting existing documents with source: "${source}"`);
      await client.query('DELETE FROM documents WHERE source = $1', [source]);
    }

    console.log(
      `\n📤 Inserting ${chunks.length} chunks for source: "${source}"`
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunk = chunks[i];

        // Generate embedding
        console.log(`  [${i + 1}/${chunks.length}] Generating embedding...`);
        const embedding = await generateEmbedding(chunk);

        // Insert ke PostgreSQL
        await client.query(
          `INSERT INTO documents (content, source, embedding, chunk_index, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            chunk,
            source,
            JSON.stringify(embedding),
            i,
            JSON.stringify({
              fileName,
              totalChunks: chunks.length,
              textLength: chunk.length,
              chunkStartChar: i * 800, // Approximate
            }),
          ]
        );

        successCount++;
        console.log(`  [${i + 1}/${chunks.length}] ✓ Inserted`);

        // Rate limit untuk avoid API throttling
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        errorCount++;
        console.error(
          `  [${i + 1}/${chunks.length}] ✗ Error: ${error.message}`
        );
      }
    }

    // Save ingest metadata
    await client.query(
      `INSERT INTO ingest_metadata (file_name, source, total_chunks, text_length, embedding_model)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        fileName,
        source,
        chunks.length,
        chunks.reduce((sum, c) => sum + c.length, 0),
        'text-embedding-3-small',
      ]
    );

    console.log(`\n✅ Ingestion complete!`);
    console.log(`   Success: ${successCount}/${chunks.length}`);
    console.log(`   Errors: ${errorCount}/${chunks.length}`);

    return { successCount, errorCount, totalChunks: chunks.length };
  } finally {
    client.release();
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  const fileIndex = args.indexOf('--file');
  const dirIndex = args.indexOf('--dir');
  const urlIndex = args.indexOf('--url');
  const sourceIndex = args.indexOf('--source');
  const chunkSizeIndex = args.indexOf('--chunk-size');

  let filePath = fileIndex !== -1 ? args[fileIndex + 1] : null;
  let dirPath = dirIndex !== -1 ? args[dirIndex + 1] : null;
  let url = urlIndex !== -1 ? args[urlIndex + 1] : null;
  let source = sourceIndex !== -1 ? args[sourceIndex + 1] : 'Imported Document';
  let chunkSize = chunkSizeIndex !== -1 ? parseInt(args[chunkSizeIndex + 1]) : 1000;

  if (!filePath && !dirPath && !url) {
    console.log(`
📚 Blog Assistant - Data Ingestion Script

Usage:
  node ingest-postgres.js --file path/to/file.txt --source "Document Source"
  node ingest-postgres.js --dir path/to/folder --source "Document Source"
  node ingest-postgres.js --url https://example.com/doc.txt --source "Document Source"

Options:
  --file <path>        : Path to single text file
  --dir <path>         : Path to directory with .txt or .md files
  --url <url>          : URL to text document
  --source <name>      : Source name (default: "Imported Document")
  --chunk-size <size>  : Chunk size in characters (default: 1000)

Example:
  node ingest-postgres.js --file ./blog-posts/post1.txt --source "Blog Post #1"
    `);
    process.exit(1);
  }

  try {
    let text = '';

    if (filePath) {
      console.log(`📂 Reading file: ${filePath}`);
      text = await readTextFromFile(filePath);
    } else if (dirPath) {
      console.log(`📁 Reading directory: ${dirPath}`);
      text = await readTextFromDirectory(dirPath);
    } else if (url) {
      console.log(`🔗 Fetching from URL: ${url}`);
      text = await readTextFromURL(url);
    }

    if (!text || text.trim().length === 0) {
      console.error('❌ No text content found');
      process.exit(1);
    }

    console.log(`\n📊 Text statistics:`);
    console.log(`   Total characters: ${text.length}`);
    console.log(`   Total words: ${text.split(/\\s+/).length}`);

    // Split into chunks
    const chunks = splitTextIntoChunks(text, chunkSize, 200);
    console.log(`   Total chunks: ${chunks.length}`);

    // Insert to PostgreSQL
    const fileName = filePath
      ? path.basename(filePath)
      : dirPath
        ? path.basename(dirPath)
        : 'imported-url';

    await insertDocumentsIntoPostgres(chunks, source, fileName);

    console.log(`\n🎉 Successfully ingested "${source}"`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
