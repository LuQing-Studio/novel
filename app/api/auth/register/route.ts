import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/constants';
import { hashPassword } from '@/lib/auth/password';

interface NewUserRequestBody {
  email: unknown;
  password: unknown;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewUserRequestBody;

    const emailRaw = typeof body.email === 'string' ? body.email : '';
    const passwordRaw = typeof body.password === 'string' ? body.password : '';

    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const beforeUserCount = await queryOne<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM users'
    );
    const isFirstUser = (beforeUserCount?.count ?? 0) === 0;

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const [user] = await query<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email`,
      [email, passwordHash]
    );

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    if (isFirstUser) {
      await query('UPDATE novels SET user_id = $1 WHERE user_id IS NULL', [user.id]);
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, user.id, expiresAt]
    );

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Failed to register:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}

