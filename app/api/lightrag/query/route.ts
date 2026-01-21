import { NextRequest, NextResponse } from 'next/server';
import { getLightRAGClient } from '@/lib/lightrag/client';

export async function POST(request: NextRequest) {
  try {
    const { query, mode = 'hybrid' } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const client = getLightRAGClient();
    const response = await client.query({ query, mode });

    return NextResponse.json(response);
  } catch (error) {
    console.error('LightRAG query error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
