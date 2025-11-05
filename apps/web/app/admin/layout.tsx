import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import type { Metadata } from 'next';
import { authOptions } from '@/auth';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: 'Admin Console · Euclid Network',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session || role !== 'ADMIN') {
    redirect('/home');
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 pb-16">
      <header className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Admin Console</h1>
            <p className="text-sm text-muted-foreground">
              Central hub for user administration, moderation oversight, and system configuration.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <AdminNav />
        </div>
      </header>
      <section className="space-y-6">{children}</section>
    </div>
  );
}
