import { NextRequest } from 'next/server';

export const ADMIN_EMAIL = 'admin@adi-muhamad.my.id';
export const ADMIN_PASSWORD = 'admin123';
export const SESSION_SECRET = 'sontoloyo-admin-secret-2026';
export const ADMIN_SESSION_COOKIE = 'admin_session';

/**
 * Membuat token sesi admin berbasis base64.
 */
export function createAdminSessionToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}:${SESSION_SECRET}`).toString('base64');
}

/**
 * Memeriksa apakah request membawa cookie sesi admin yang valid.
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!session) return false;
  try {
    const decoded = Buffer.from(session, 'base64').toString('utf-8');
    return decoded.includes(ADMIN_EMAIL);
  } catch {
    return false;
  }
}
