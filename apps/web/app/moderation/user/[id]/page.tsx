import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ModerationUserClient } from './ModerationUserClient';

interface ModerationUserPageProps {
  params: { id: string };
}

export default async function ModerationUserPage({ params }: ModerationUserPageProps) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      handle: true,
      display: true,
      email: true,
      bannedUntil: true,
      isBanned: true,
    },
  });

  if (!user) {
    notFound();
  }

  const displayName = user.display ?? user.name ?? user.handle ?? user.email ?? user.id;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">
              User ID: <span className="font-mono text-xs">{user.id}</span>
            </p>
          </div>
          {user.isBanned ? (
            <div className="rounded-full bg-destructive/10 px-4 py-1 text-sm text-destructive">
              Suspended{' '}
              {user.bannedUntil
                ? `until ${new Date(user.bannedUntil).toLocaleString()}`
                : 'indefinitely'}
            </div>
          ) : null}
        </div>
      </section>
      <ModerationUserClient userId={user.id} displayName={displayName} />
    </div>
  );
}
