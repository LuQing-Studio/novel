import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireApiUser } from '@/lib/auth/api';
import { getTechRAGClient } from '@/lib/lightrag/client';

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function nextTechniqueVersionNumber(techniqueId: string): Promise<number> {
  const row = await queryOne<{ next: number }>(
    'SELECT (COALESCE(MAX(version_number), 0) + 1)::int AS next FROM technique_versions WHERE technique_id = $1',
    [techniqueId]
  );
  return row?.next ?? 1;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser();
    if ('response' in auth) return auth.response;

    const { user } = auth;
    const { id } = await params;

    const technique = await queryOne<{
      id: string;
      userId: string;
      title: string;
      tags: string[];
      content: string;
    }>('SELECT * FROM techniques WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (!technique) {
      return NextResponse.json({ error: 'Technique not found' }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const versionId = safeString(body.versionId ?? body.version_id).trim();
    if (!versionId) {
      return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
    }

    const version = await queryOne<{
      id: string;
      title: string;
      tags: string[];
      content: string;
    }>(
      `SELECT v.id, v.title, v.tags, v.content
       FROM technique_versions v
       JOIN techniques t ON t.id = v.technique_id
       WHERE v.id = $1 AND v.technique_id = $2 AND t.user_id = $3`,
      [versionId, id, user.id]
    );
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Snapshot current state before restore
    const next = await nextTechniqueVersionNumber(id);
    await query(
      `INSERT INTO technique_versions (technique_id, version_number, title, tags, content, created_by, change_description)
       VALUES ($1, $2, $3, $4, $5, 'user', '恢复前快照')`,
      [id, next, technique.title, technique.tags || [], technique.content]
    );

    const [updated] = await query(
      `UPDATE techniques
       SET title = $1, tags = $2, content = $3, sync_status = 'pending', updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [version.title, version.tags || [], version.content, id, user.id]
    );

    // Best-effort sync
    try {
      const techClient = getTechRAGClient();
      const description = `technique:${id} | ${version.title} | tags:${(version.tags || []).join(',')}`;
      const upload = await techClient.uploadDocument({ content: version.content, description });
      const docId = upload?.doc_id || upload?.docId || null;

      const [synced] = await query(
        `UPDATE techniques
         SET sync_status = 'synced', last_synced_at = NOW(), lightrag_doc_id = COALESCE($1, lightrag_doc_id), updated_at = NOW()
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [docId, id, user.id]
      );
      return NextResponse.json(synced);
    } catch (error) {
      console.warn('Failed to sync technique after restore:', error);
      const [failed] = await query(
        `UPDATE techniques
         SET sync_status = 'failed', updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, user.id]
      );
      return NextResponse.json(failed);
    }
  } catch (error) {
    console.error('Failed to restore technique version:', error);
    return NextResponse.json({ error: 'Failed to restore technique version' }, { status: 500 });
  }
}

