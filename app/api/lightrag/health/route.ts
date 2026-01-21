import { NextResponse } from 'next/server';
import { getLightRAGClient } from '@/lib/lightrag/client';

export async function GET() {
  try {
    const client = getLightRAGClient();
    const health = await client.health();

    return NextResponse.json({
      status: 'connected',
      lightrag: health,
    });
  } catch (error) {
    console.error('LightRAG health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
