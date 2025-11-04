import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { deleteNode, getNodeDetail, updateNode } from '@/lib/nodes';
import { nodeUpdateSchema } from '@euclid/validation';

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const node = await getNodeDetail(params.id);
  if (!node) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(node, { status: 200 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const result = nodeUpdateSchema.safeParse({ ...payload, id: params.id });

  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  const updated = await updateNode(params.id, result.data);
  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await deleteNode(params.id);
  return new NextResponse(null, { status: 204 });
}
