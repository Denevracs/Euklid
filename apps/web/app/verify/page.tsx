import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { VerifyPageClient } from './VerifyPageClient';

export default async function VerifyPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/api/auth/signin?callbackUrl=/verify');
  }

  return <VerifyPageClient initialProfile={session.user ?? null} />;
}
