import { NextResponse } from 'next/server';
import { getGraphNeighborhood } from '@/lib/nodes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get('nodeId');
  const depthParam = Number(searchParams.get('depth') ?? '1');
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
  }
  const depth = Number.isFinite(depthParam) ? Math.min(Math.max(depthParam, 1), 3) : 1;
  const graph = await getGraphNeighborhood(nodeId, depth);
  if (!graph) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(graph);
}
