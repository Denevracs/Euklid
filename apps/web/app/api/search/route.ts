import { NextResponse } from 'next/server';
import { searchNodes } from '@/lib/nodes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? '';
  if (!query) {
    return NextResponse.json([], { status: 200 });
  }
  const results = await searchNodes(query);
  return NextResponse.json(results);
}
