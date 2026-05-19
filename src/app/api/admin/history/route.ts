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
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    let whereClause = '';
    const params: any[] = [limit, offset];

    if (search) {
      whereClause = `WHERE user_message ILIKE $3 OR assistant_message ILIKE $3`;
      params.push(`%${search}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM chat_history ${search ? `WHERE user_message ILIKE $1 OR assistant_message ILIKE $1` : ''}`,
      search ? [`%${search}%`] : []
    );

    const result = await query(
      `SELECT id, user_message, assistant_message, message_tokens, completion_tokens, total_tokens, created_at
       FROM chat_history
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}
