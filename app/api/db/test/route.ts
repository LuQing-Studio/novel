import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query<{ currentTime: string; version: string }>(
      'SELECT NOW() as current_time, version() as version'
    );

    const tables = await query<{ tableName: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('novels', 'chapters', 'characters', 'foreshadowing', 'world_settings')
      ORDER BY table_name
    `);

    return NextResponse.json({
      status: 'connected',
      timestamp: result[0]?.currentTime,
      version: result[0]?.version,
      tables: tables.map((t) => t.tableName),
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
