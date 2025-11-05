import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { apiBaseUrl, apiInternalSecret } from '@/lib/env';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = body?.userId as string | undefined;
  if (!userId) {
    return NextResponse.json({ message: 'userId is required' }, { status: 400 });
  }

  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': apiInternalSecret,
    },
    body: JSON.stringify({ userId }),
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
