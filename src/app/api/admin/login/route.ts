import { NextRequest, NextResponse } from 'next/server';

const ADMIN_EMAIL = 'admin@adi-muhamad.my.id';
const ADMIN_PASSWORD = 'admin123';
const SESSION_SECRET = 'sontoloyo-admin-secret-2026';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    const sessionToken = Buffer.from(`${email}:${Date.now()}:${SESSION_SECRET}`).toString('base64');

    const res = NextResponse.json({ success: true, message: 'Login berhasil' });
    res.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 jam
      path: '/',
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: 'Logout berhasil' });
  res.cookies.delete('admin_session');
  return res;
}
