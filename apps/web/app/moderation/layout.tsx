import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Metadata } from 'next';
import { authOptions } from '@/auth';
import { ModerationNav } from './ModerationNav';

export const metadata: Metadata = {
  title: 'Moderation · Euclid Network',
};

export default async function ModerationLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || (role !== 'ADMIN' && role !== 'MODERATOR')) {
    redirect('/home');
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-16">
      <header className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Moderation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage reports, enforce community standards, and understand safety workload.
        </p>
        <ModerationNav />
      </header>
      {children}
    </div>
  );
}
