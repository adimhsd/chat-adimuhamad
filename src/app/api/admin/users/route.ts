import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import {
  AdminUserRecord,
  ensureAdminUsersTable,
  getAuthenticatedAdminEmail,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: NextRequest) {
  const currentAdminEmail = getAuthenticatedAdminEmail(req);
  if (!currentAdminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAdminUsersTable();
    const res = await query<AdminUserRecord>(
      `SELECT id, name, email, created_at, updated_at
       FROM admin_users
       ORDER BY id ASC`
    );

    return NextResponse.json({
      currentAdminEmail,
      users: res.rows,
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil daftar administrator' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const currentAdminEmail = getAuthenticatedAdminEmail(req);
  if (!currentAdminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAdminUsersTable();
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const cleanName = (body.name || '').trim().slice(0, 120);
    const cleanEmail = (body.email || '').trim().toLowerCase().slice(0, 255);
    const password = body.password || '';

    if (!cleanName) {
      return NextResponse.json(
        { error: 'Nama lengkap admin wajib diisi.' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Format email admin tidak valid.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password minimal harus 6 karakter.' },
        { status: 400 }
      );
    }

    const existing = await query<{ id: number }>(
      'SELECT id FROM admin_users WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: `Email "${cleanEmail}" sudah terdaftar sebagai admin.` },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);
    const inserted = await query<AdminUserRecord>(
      `INSERT INTO admin_users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at, updated_at`,
      [cleanName, cleanEmail, passwordHash]
    );

    return NextResponse.json(
      {
        success: true,
        message: `Admin "${cleanName}" berhasil ditambahkan.`,
        user: inserted.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Gagal menambahkan akun administrator.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const currentAdminEmail = getAuthenticatedAdminEmail(req);
  if (!currentAdminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAdminUsersTable();
    const body = (await req.json()) as {
      id?: number;
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const targetId = body.id ? Number(body.id) : null;
    const targetQuery = targetId
      ? await query<{
          id: number;
          name: string;
          email: string;
          password_hash: string;
        }>(
          'SELECT id, name, email, password_hash FROM admin_users WHERE id = $1 LIMIT 1',
          [targetId]
        )
      : await query<{
          id: number;
          name: string;
          email: string;
          password_hash: string;
        }>(
          'SELECT id, name, email, password_hash FROM admin_users WHERE LOWER(email) = $1 LIMIT 1',
          [currentAdminEmail]
        );

    const targetUser = targetQuery.rows[0];
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Akun administrator tidak ditemukan.' },
        { status: 404 }
      );
    }

    const cleanName =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim().slice(0, 120)
        : targetUser.name;

    const newPassword = body.newPassword || '';
    const isSelf = targetUser.email.toLowerCase() === currentAdminEmail;

    if (!newPassword && cleanName === targetUser.name) {
      return NextResponse.json(
        { error: 'Masukkan password baru atau ubah nama untuk menyimpan perubahan.' },
        { status: 400 }
      );
    }

    let nextPasswordHash = targetUser.password_hash;

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password baru minimal harus 6 karakter.' },
          { status: 400 }
        );
      }

      if (isSelf) {
        if (!body.currentPassword) {
          return NextResponse.json(
            { error: 'Masukkan password saat ini untuk mengganti password Anda.' },
            { status: 400 }
          );
        }
        const matches = verifyPassword(
          body.currentPassword,
          targetUser.password_hash
        );
        if (!matches) {
          return NextResponse.json(
            { error: 'Password saat ini tidak sesuai.' },
            { status: 400 }
          );
        }
      }

      nextPasswordHash = hashPassword(newPassword);
    }

    const updated = await query<AdminUserRecord>(
      `UPDATE admin_users
       SET name = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, name, email, created_at, updated_at`,
      [cleanName, nextPasswordHash, targetUser.id]
    );

    return NextResponse.json({
      success: true,
      message: newPassword
        ? `Password untuk ${targetUser.email} berhasil diperbarui.`
        : `Profil ${targetUser.email} berhasil diperbarui.`,
      user: updated.rows[0],
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui data administrator.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const currentAdminEmail = getAuthenticatedAdminEmail(req);
  if (!currentAdminEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureAdminUsersTable();
    const idParam = new URL(req.url).searchParams.get('id');
    const targetId = idParam ? parseInt(idParam, 10) : NaN;

    if (Number.isNaN(targetId)) {
      return NextResponse.json(
        { error: 'Parameter id admin tidak valid.' },
        { status: 400 }
      );
    }

    const countRes = await query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM admin_users'
    );
    if ((countRes.rows[0]?.total ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus satu-satunya administrator aktif.' },
        { status: 400 }
      );
    }

    const targetRes = await query<{ id: number; email: string }>(
      'SELECT id, email FROM admin_users WHERE id = $1 LIMIT 1',
      [targetId]
    );
    const target = targetRes.rows[0];
    if (!target) {
      return NextResponse.json(
        { error: 'Akun administrator tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (target.email.toLowerCase() === currentAdminEmail) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun yang sedang Anda gunakan login.' },
        { status: 400 }
      );
    }

    await query('DELETE FROM admin_users WHERE id = $1', [targetId]);
    return NextResponse.json({
      success: true,
      message: `Admin ${target.email} berhasil dihapus.`,
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus akun administrator.' },
      { status: 500 }
    );
  }
}
