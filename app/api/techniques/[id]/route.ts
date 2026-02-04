import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
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

async function nextTechniqueVersionNumber(techniqueId: string): Promise<number> {
  const row = await queryOne<{ next: number }>(
    'SELECT (COALESCE(MAX(version_number), 0) + 1)::int AS next FROM technique_versions WHERE technique_id = $1',
    [techniqueId]
  );
  return row?.next ?? 1;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const { id } = await params;

    const technique = await queryOne<TechniqueRow>(
      'SELECT * FROM techniques WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );
    if (!technique) {
      return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
    }

    return NextResponse.json(technique);
  } catch (error) {
    console.error('Failed to fetch technique:', error);
    return NextResponse.json({ error: 'Failed to fetch technique' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const { id } = await params;

    const existing = await queryOne<TechniqueRow>(
      'SELECT * FROM techniques WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const title = body.title !== undefined ? safeString(body.title).trim() : existing.title;
    const content = body.content !== undefined ? safeString(body.content).trim() : existing.content;
    const tags = body.tags !== undefined ? normalizeTags(body.tags) : (existing.tags || []);
    const changeDescription = safeString(body.changeDescription ?? body.change_description).trim();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Save previous version snapshot
    const versionNumber = await nextTechniqueVersionNumber(id);
    await query(
      `INSERT INTO technique_versions (technique_id, version_number, title, tags, content, created_by, change_description)
       VALUES ($1, $2, $3, $4, $5, 'user', $6)`,
      [id, versionNumber, existing.title, existing.tags || [], existing.content, changeDescription || '更新前版本快照']
    );

    const [updated] = await query<TechniqueRow>(
      `UPDATE techniques
       SET title = $1, tags = $2, content = $3, sync_status = 'pending', updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, tags, content, id, user.id]
    );

    // Best-effort sync to Tech LightRAG
    try {
      const techClient = getTechRAGClient();
      const description = `technique:${id} | ${title} | tags:${tags.join(',')}`;
      const upload = await techClient.uploadDocument({ content, description });
      const docId = upload?.doc_id || upload?.docId || null;

      const [synced] = await query<TechniqueRow>(
        `UPDATE techniques
         SET sync_status = 'synced', last_synced_at = NOW(), lightrag_doc_id = COALESCE($1, lightrag_doc_id), updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [docId, id, user.id]
      );
      return NextResponse.json(synced);
    } catch (error) {
      console.warn('Failed to sync technique to Tech LightRAG:', error);
      const [failed] = await query<TechniqueRow>(
        `UPDATE techniques
         SET sync_status = 'failed', updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, user.id]
      );
      return NextResponse.json(failed);
    }
  } catch (error) {
    console.error('Failed to update technique:', error);
    return NextResponse.json({ error: 'Failed to update technique' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const { id } = await params;

    const technique = await queryOne<TechniqueRow>(
      'SELECT * FROM techniques WHERE id = $1 AND user_id = $2',
      [id, user.id]
    );
    if (!technique) {
      return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
    }

    // Best-effort delete from Tech LightRAG (only if we have a doc id)
    if (technique.lightragDocId) {
      try {
        const techClient = getTechRAGClient();
        await techClient.deleteDocument(technique.lightragDocId);
      } catch (error) {
        console.warn('Failed to delete Tech LightRAG doc:', error);
      }
    }

    await query('DELETE FROM techniques WHERE id = $1 AND user_id = $2', [id, user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete technique:', error);
    return NextResponse.json({ error: 'Failed to delete technique' }, { status: 500 });
  }
}

