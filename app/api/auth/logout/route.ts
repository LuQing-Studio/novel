import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (sessionId) {
      await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    }

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error('Failed to logout:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}
