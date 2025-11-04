import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createEvidence } from '@/lib/nodes';
import { evidenceCreateSchema } from '@euclid/validation';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const result = evidenceCreateSchema.safeParse(payload);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  const evidence = await createEvidence(result.data, session.user.id);
  return NextResponse.json(evidence, { status: 201 });
}
