import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/constants';
import { verifyPassword } from '@/lib/auth/password';

interface LoginRequestBody {
  email: unknown;
  password: unknown;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody;

    const emailRaw = typeof body.email === 'string' ? body.email : '';
    const passwordRaw = typeof body.password === 'string' ? body.password : '';

    const email = emailRaw.trim().toLowerCase();
    const password = passwordRaw;

    if (!email || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = await queryOne<{ id: string; email: string; passwordHash: string }>(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, user.id, expiresAt]
    );

    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error('Failed to login:', error);
    return NextResponse.json({ error: 'Failed to login' }, { status: 500 });
  }
}

