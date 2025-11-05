import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { AdminVerificationClient } from './AdminVerificationClient';

export default async function AdminVerificationPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || (role !== 'ADMIN' && role !== 'MODERATOR')) {
    redirect('/verify');
  }

  return <AdminVerificationClient />;
}
