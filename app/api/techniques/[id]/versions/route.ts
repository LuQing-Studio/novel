import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiUser } from '@/lib/auth/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const { id } = await params;

    const versions = await query(
      `SELECT v.*
       FROM technique_versions v
       JOIN techniques t ON t.id = v.technique_id
       WHERE v.technique_id = $1 AND t.user_id = $2
       ORDER BY v.version_number DESC`,
      [id, user.id]
    );

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to fetch technique versions:', error);
    return NextResponse.json({ error: 'Failed to fetch technique versions' }, { status: 500 });
  }
}

