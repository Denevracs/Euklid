import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { authOptions } from '@/server/auth';

export async function requireSession(options?: { redirectTo?: string }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    const redirectTarget = options?.redirectTo ?? '/api/auth/signin';
    redirect(redirectTarget);
  }
  return session;
}

export function requireNotBanned(session: Session) {
  const bannedUntil = session.user?.bannedUntil ? new Date(session.user.bannedUntil) : null;
  if (bannedUntil && bannedUntil > new Date()) {
    throw new Error(`Account is banned until ${bannedUntil.toISOString()}`);
  }
  return session;
}
