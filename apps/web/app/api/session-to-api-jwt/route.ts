import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { apiBaseUrl, apiInternalSecret } from '@/lib/env';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${apiBaseUrl}/auth/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': apiInternalSecret,
    },
    body: JSON.stringify({ userId: session.user.id }),
  });

  const payload = await response.json().catch(() => ({}));

  return NextResponse.json(payload, { status: response.status });
}
