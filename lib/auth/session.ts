import { cookies } from 'next/headers';
import { queryOne } from '@/lib/db';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';

export interface AuthUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const user = await queryOne<AuthUser>(
    `SELECT u.id, u.email
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1
       AND s.expires_at > NOW()`,
    [sessionId]
  );

  return user;
}
