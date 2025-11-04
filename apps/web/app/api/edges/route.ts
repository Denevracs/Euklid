import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createEdge } from '@/lib/nodes';
import { edgeCreateSchema } from '@euclid/validation';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const result = edgeCreateSchema.safeParse(payload);

  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  const edge = await createEdge(result.data);
  return NextResponse.json(edge, { status: 201 });
}
