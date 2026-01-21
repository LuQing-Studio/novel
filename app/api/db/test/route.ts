import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');

    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('novels', 'chapters', 'characters', 'foreshadowing', 'world_settings')
      ORDER BY table_name
    `);

    return NextResponse.json({
      status: 'connected',
      timestamp: result[0].current_time,
      version: result[0].version,
      tables: tables.map((t: any) => t.table_name),
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
