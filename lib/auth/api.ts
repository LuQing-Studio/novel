import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { getCurrentUser, type AuthUser } from '@/lib/auth/session';
import type { Novel } from '@/lib/types';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function requireApiUser(): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user };
}

export async function requireApiNovelOwner(
  novelId: string
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const auth = await requireApiUser();
  if ('response' in auth) return auth;

  const { user } = auth;
  if (!isUuid(novelId)) {
    return { response: NextResponse.json({ error: 'Invalid novel ID format. Expected UUID.' }, { status: 400 }) };
  }

  const novel = await queryOne<{ id: string }>(
    'SELECT id FROM novels WHERE id = $1 AND user_id = $2',
    [novelId, user.id]
  );

  if (!novel) {
    return { response: NextResponse.json({ error: 'Novel not found' }, { status: 404 }) };
  }

  return { user };
}

export async function requireApiNovel(
  novelId: string
): Promise<{ user: AuthUser; novel: Novel } | { response: NextResponse }> {
  const auth = await requireApiUser();
  if ('response' in auth) return auth;

  const { user } = auth;
  if (!isUuid(novelId)) {
    return { response: NextResponse.json({ error: 'Invalid novel ID format. Expected UUID.' }, { status: 400 }) };
  }

  const novel = await queryOne<Novel>(
    'SELECT * FROM novels WHERE id = $1 AND user_id = $2',
    [novelId, user.id]
  );

  if (!novel) {
    return { response: NextResponse.json({ error: 'Novel not found' }, { status: 404 }) };
  }

  return { user, novel };
}
