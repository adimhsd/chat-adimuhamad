import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  EMBEDDING_MODEL,
  generateEmbedding,
  splitTextIntoChunks,
} from '@/lib/rag';

const MAX_CHUNKS_PER_IMPORT = 150;

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const source = new URL(req.url).searchParams.get('source');

    if (source) {
      const chunksResult = await query<{
        id: number;
        chunk_index: number;
        content: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>(
        `SELECT id, chunk_index, content, metadata, created_at
         FROM documents
         WHERE source = $1
         ORDER BY chunk_index ASC, id ASC`,
        [source]
      );

      return NextResponse.json({
        source,
        chunks: chunksResult.rows,
      });
    }

    const [sourcesResult, historyResult] = await Promise.all([
      query<{
        source: string;
        chunk_count: number;
        total_chars: number;
        last_updated: string;
        has_embeddings: boolean;
      }>(
        `SELECT
           source,
           COUNT(*)::int AS chunk_count,
           COALESCE(SUM(LENGTH(content)), 0)::int AS total_chars,
           MAX(updated_at) AS last_updated,
           BOOL_AND(embedding IS NOT NULL) AS has_embeddings
         FROM documents
         GROUP BY source
         ORDER BY MAX(updated_at) DESC`
      ),
      query<{
        id: number;
        file_name: string;
        source: string;
        total_chunks: number;
        text_length: number;
        embedding_model: string;
        ingested_at: string;
      }>(
        `SELECT id, file_name, source, total_chunks, text_length, embedding_model, ingested_at
         FROM ingest_metadata
         ORDER BY ingested_at DESC
         LIMIT 20`
      ),
    ]);

    const sources = sourcesResult.rows;
    const totalChunks = sources.reduce((sum, item) => sum + item.chunk_count, 0);
    const totalChars = sources.reduce((sum, item) => sum + item.total_chars, 0);

    return NextResponse.json({
      stats: {
        totalSources: sources.length,
        totalChunks,
        totalChars,
        embeddingModel: EMBEDDING_MODEL,
      },
      sources,
      history: historyResult.rows,
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data knowledge base' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      source?: string;
      content?: string;
      fileName?: string;
      chunkSize?: number;
      overlap?: number;
      mode?: 'replace' | 'append';
    };

    const cleanSource = (body.source || '').trim().slice(0, 255);
    const cleanContent = (body.content || '').trim();
    const cleanFileName = (body.fileName || 'manual-input.txt').trim().slice(0, 255);
    const mode = body.mode === 'append' ? 'append' : 'replace';

    if (!cleanSource) {
      return NextResponse.json(
        { error: 'Nama sumber / topik dokumen wajib diisi.' },
        { status: 400 }
      );
    }

    if (!cleanContent) {
      return NextResponse.json(
        { error: 'Konten teks dokumen tidak boleh kosong.' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY belum dikonfigurasi di server.' },
        { status: 500 }
      );
    }

    const chunkSize = Number(body.chunkSize) || 1000;
    const overlap = Number(body.overlap ?? 200);
    const chunks = splitTextIntoChunks(cleanContent, chunkSize, overlap);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada potongan teks valid untuk diproses.' },
        { status: 400 }
      );
    }

    if (chunks.length > MAX_CHUNKS_PER_IMPORT) {
      return NextResponse.json(
        {
          error: `Dokumen terlalu panjang (${chunks.length} chunks). Maksimal ${MAX_CHUNKS_PER_IMPORT} chunks per import lewat Web UI, atau gunakan CLI ingest-postgres.js.`,
        },
        { status: 400 }
      );
    }

    // Generate seluruh embedding terlebih dahulu sebelum memodifikasi DB agar aman jika API OpenAI error
    const embeddings: number[][] = [];
    for (const chunk of chunks) {
      const vector = await generateEmbedding(chunk);
      embeddings.push(vector);
    }

    let startIndex = 0;
    if (mode === 'replace') {
      await query('DELETE FROM documents WHERE source = $1', [cleanSource]);
    } else {
      const maxRes = await query<{ next_index: number }>(
        'SELECT COALESCE(MAX(chunk_index), -1)::int + 1 AS next_index FROM documents WHERE source = $1',
        [cleanSource]
      );
      startIndex = maxRes.rows[0]?.next_index ?? 0;
    }

    const totalTextLength = chunks.reduce((sum, c) => sum + c.length, 0);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkIndex = startIndex + i;
      const metadata = {
        fileName: cleanFileName,
        totalChunks: chunks.length,
        textLength: chunk.length,
        importedVia: 'admin-ui',
      };

      await query(
        `INSERT INTO documents (content, source, embedding, chunk_index, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          chunk,
          cleanSource,
          JSON.stringify(embeddings[i]),
          chunkIndex,
          JSON.stringify(metadata),
        ]
      );
    }

    await query(
      `INSERT INTO ingest_metadata (file_name, source, total_chunks, text_length, embedding_model)
       VALUES ($1, $2, $3, $4, $5)`,
      [cleanFileName, cleanSource, chunks.length, totalTextLength, EMBEDDING_MODEL]
    );

    return NextResponse.json(
      {
        success: true,
        source: cleanSource,
        mode,
        totalChunks: chunks.length,
        totalChars: totalTextLength,
        embeddingModel: EMBEDDING_MODEL,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error importing knowledge base:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Gagal memproses embedding: ${error.message}`
            : 'Gagal memproses embedding dokumen.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const sourceParam = searchParams.get('source');

    if (idParam) {
      const id = parseInt(idParam, 10);
      if (Number.isNaN(id)) {
        return NextResponse.json({ error: 'ID chunk tidak valid' }, { status: 400 });
      }
      const res = await query('DELETE FROM documents WHERE id = $1', [id]);
      return NextResponse.json({ success: true, deletedCount: res.rowCount || 0 });
    }

    if (sourceParam) {
      const res = await query('DELETE FROM documents WHERE source = $1', [sourceParam]);
      return NextResponse.json({ success: true, deletedCount: res.rowCount || 0 });
    }

    return NextResponse.json(
      { error: 'Parameter ?source= atau ?id= wajib disertakan' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting knowledge document:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus data knowledge base' },
      { status: 500 }
    );
  }
}
