import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiUser } from '@/lib/auth/api';
import { getTechRAGClient } from '@/lib/lightrag/client';

interface TechniqueRow {
  id: string;
  userId: string;
  title: string;
  tags: string[];
  content: string;
  syncStatus: string;
  lastSyncedAt: Date | null;
  lightragDocId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeTags(value: unknown): string[] {
  const raw =
    Array.isArray(value) ? value.map((v) => safeString(v)) : safeString(value).split(',');
  const cleaned = raw
    .map((t) => t.trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const url = new URL(request.url);
    const q = (url.searchParams.get('query') || '').trim();
    const tag = (url.searchParams.get('tag') || '').trim();

    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [user.id];
    let paramIndex = 2;

    if (q) {
      conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
      values.push(`%${q}%`);
      paramIndex += 1;
    }

    if (tag) {
      conditions.push(`tags @> ARRAY[$${paramIndex}]::text[]`);
      values.push(tag);
      paramIndex += 1;
    }

    const techniques = await query<TechniqueRow>(
      `SELECT * FROM techniques WHERE ${conditions.join(' AND ')} ORDER BY updated_at DESC`,
      values
    );
    return NextResponse.json(techniques);
  } catch (error) {
    console.error('Failed to fetch techniques:', error);
    return NextResponse.json({ error: 'Failed to fetch techniques' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const body = (await request.json()) as Record<string, unknown>;
    const title = safeString(body.title).trim();
    const content = safeString(body.content).trim();
    const tags = normalizeTags(body.tags);

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const [technique] = await query<TechniqueRow>(
      `INSERT INTO techniques (user_id, title, tags, content, sync_status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [user.id, title, tags, content]
    );

    // Create initial version snapshot (v1)
    await query(
      `INSERT INTO technique_versions (technique_id, version_number, title, tags, content, created_by, change_description)
       VALUES ($1, 1, $2, $3, $4, 'user', '初始版本')`,
      [technique.id, title, tags, content]
    );

    // Best-effort sync to Tech LightRAG
    try {
      const techClient = getTechRAGClient();
      const description = `technique:${technique.id} | ${title} | tags:${tags.join(',')}`;
      const upload = await techClient.uploadDocument({ content, description });
      const docId = upload?.doc_id || upload?.docId || null;

      const [synced] = await query<TechniqueRow>(
        `UPDATE techniques
         SET sync_status = 'synced', last_synced_at = NOW(), lightrag_doc_id = COALESCE($1, lightrag_doc_id), updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [docId, technique.id, user.id]
      );
      return NextResponse.json(synced, { status: 201 });
    } catch (error) {
      console.warn('Failed to sync technique to Tech LightRAG:', error);
      const [failed] = await query<TechniqueRow>(
        `UPDATE techniques
         SET sync_status = 'failed', updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [technique.id, user.id]
      );
      return NextResponse.json(failed, { status: 201 });
    }
  } catch (error) {
    console.error('Failed to create technique:', error);
    return NextResponse.json({ error: 'Failed to create technique' }, { status: 500 });
  }
}
