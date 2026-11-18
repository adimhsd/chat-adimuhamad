import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
} from '@/lib/auth';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Verifikasi token Cloudflare Turnstile ke API siteverify.
 * Hanya dijalankan jika TURNSTILE_SECRET_KEY terkonfigurasi.
 */
async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    return { ok: true };
  }

  if (typeof token !== 'string' || !token.trim()) {
    return {
      ok: false,
      status: 400,
      error: 'Pendeteksi bot: Silakan selesaikan verifikasi keamanan Turnstile terlebih dahulu.',
    };
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token,
    });
    if (remoteIp) {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: 'Gagal menghubungi layanan verifikasi bot Cloudflare.',
      };
    }

    const result = (await response.json()) as { success?: boolean };
    if (result.success !== true) {
      return {
        ok: false,
        status: 400,
        error: 'Pendeteksi bot: Verifikasi keamanan gagal atau kedaluwarsa. Silakan coba lagi.',
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'Gagal melakukan verifikasi bot (jaringan bermasalah).',
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, turnstile_token } = await req.json();

    const remoteIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null;

    const turnstileCheck = await verifyTurnstileToken(turnstile_token, remoteIp);
    if (!turnstileCheck.ok) {
      return NextResponse.json(
        { error: turnstileCheck.error },
        { status: turnstileCheck.status || 400 }
      );
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    const sessionToken = createAdminSessionToken(email);

    const res = NextResponse.json({ success: true, message: 'Login berhasil' });
    res.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
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
  res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
