import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FollowButton } from '@/components/follow/FollowButton';

interface DisciplinePageProps {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

export default async function DisciplinePage({ params }: DisciplinePageProps) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const discipline = await prisma.discipline.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      nodes: {
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          createdAt: true,
          createdBy: { select: { id: true, name: true, handle: true } },
        },
      },
    },
  });

  if (!discipline) {
    notFound();
  }

  const [followersCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followDisciplineId: discipline.id } }),
    viewerId
      ? prisma.follow.findFirst({
          where: { followerId: viewerId, followDisciplineId: discipline.id },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-16">
      <header className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">{discipline.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {discipline.description ?? 'Discipline overview coming soon.'}
            </p>
            <div className="mt-3 text-sm text-muted-foreground">
              <strong>{followersCount}</strong> researchers following
            </div>
          </div>
          {viewerId ? (
            <FollowButton
              targetId={discipline.id}
              kind="discipline"
              initialFollowing={Boolean(isFollowing)}
              ownerId={viewerId}
              size="default"
            />
          ) : null}
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recent activity</h2>
        {discipline.nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public nodes for this discipline yet.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {discipline.nodes.map((node) => (
              <li
                key={node.id}
                className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/nodes/${node.id}`} className="text-foreground hover:underline">
                    {node.title}
                  </Link>
                  {node.createdBy ? (
                    <Link
                      href={`/u/${node.createdBy.handle ?? node.createdBy.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {node.createdBy.name ?? node.createdBy.handle ?? 'Author'}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Published {new Date(node.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
