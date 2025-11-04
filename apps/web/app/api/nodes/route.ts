import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createNode, listRecentNodes } from '@/lib/nodes';
import { nodeCreateSchema } from '@euclid/validation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const take = Number(searchParams.get('take') ?? '20');
  const nodes = await listRecentNodes(Number.isFinite(take) ? take : 20);
  return NextResponse.json(nodes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const result = nodeCreateSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  const node = await createNode(result.data, session.user.id);
  return NextResponse.json(node, { status: 201 });
}
