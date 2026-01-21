import { NextRequest, NextResponse } from 'next/server';
import { getLightRAGClient } from '@/lib/lightrag/client';

export async function POST(request: NextRequest) {
  try {
    const { content, description } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const client = getLightRAGClient();
    const response = await client.uploadDocument({ content, description });

    return NextResponse.json(response);
  } catch (error) {
    console.error('LightRAG upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = getLightRAGClient();
    const status = await client.getDocumentStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error('LightRAG status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
