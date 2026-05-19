import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

function isAuthenticated(req: NextRequest): boolean {
  const session = req.cookies.get('admin_session')?.value;
  if (!session) return false;
  try {
    const decoded = Buffer.from(session, 'base64').toString('utf-8');
    return decoded.includes('admin@adi-muhamad.my.id');
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await query(
      `SELECT id, user_message, assistant_message, message_tokens, completion_tokens, total_tokens, created_at
       FROM chat_history
       ORDER BY created_at DESC`
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      total_records: result.rows.length,
      data: result.rows.map((row) => ({
        id: row.id,
        timestamp: row.created_at,
        user_message: row.user_message,
        assistant_message: row.assistant_message,
        tokens: {
          message: row.message_tokens,
          completion: row.completion_tokens,
          total: row.total_tokens,
        },
      })),
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="chat-history-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Gagal export data' }, { status: 500 });
  }
}
