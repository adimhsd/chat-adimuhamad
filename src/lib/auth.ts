import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextRequest } from 'next/server';
import { query } from '@/lib/postgres';

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@example.com')
  .trim()
  .toLowerCase();
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change_this_password';
export const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'change_this_session_secret';
export const ADMIN_SESSION_COOKIE = 'admin_session';

export interface AdminUserRecord {
  id: number;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

/**
 * Meng-hash password dengan salt acak menggunakan scrypt.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

/**
 * Memverifikasi kecocokan password plaintext terhadap hash tersimpan.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  try {
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedBuffer = scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedBuffer.length) return false;
    return timingSafeEqual(keyBuffer, derivedBuffer);
  } catch {
    return false;
  }
}

/**
 * Memastikan tabel `admin_users` tersedia dan terisi minimal 1 admin awal dari env.
 */
export async function ensureAdminUsersTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const countResult = await query<{ total: number }>(
    'SELECT COUNT(*)::int AS total FROM admin_users'
  );
  const total = countResult.rows[0]?.total ?? 0;

  if (total === 0) {
    const passwordHash = hashPassword(ADMIN_PASSWORD);
    await query(
      `INSERT INTO admin_users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['Administrator', ADMIN_EMAIL, passwordHash]
    );
  }
}

/**
 * Memvalidasi email & password terhadap tabel `admin_users`.
 */
export async function authenticateAdminCredentials(
  email: string,
  password: string
): Promise<{ id: number; name: string; email: string } | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;

  await ensureAdminUsersTable();

  const res = await query<{
    id: number;
    name: string;
    email: string;
    password_hash: string;
  }>(
    `SELECT id, name, email, password_hash
     FROM admin_users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalizedEmail]
  );

  const user = res.rows[0];
  if (!user) return null;

  const valid = verifyPassword(password, user.password_hash);
  if (!valid) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

/**
 * Membuat token sesi admin berbasis base64.
 */
export function createAdminSessionToken(email: string): string {
  return Buffer.from(
    `${email.trim().toLowerCase()}:${Date.now()}:${SESSION_SECRET}`
  ).toString('base64');
}

/**
 * Mengambil email admin yang sedang login dari cookie sesi jika valid.
 */
export function getAuthenticatedAdminEmail(req: NextRequest): string | null {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!session) return null;

  try {
    const decoded = Buffer.from(session, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 3) return null;

    const email = parts[0]?.trim().toLowerCase();
    const secret = parts.slice(2).join(':');
    if (!email || !email.includes('@') || secret !== SESSION_SECRET) {
      return null;
    }

    return email;
  } catch {
    return null;
  }
}

/**
 * Memeriksa apakah request membawa cookie sesi admin yang valid.
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  return getAuthenticatedAdminEmail(req) !== null;
}
