import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ProfilePageClient } from './ProfilePageClient';

interface ProfilePageProps {
  params: { handle: string };
}

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: ProfilePageProps) {
  const session = await getServerSession(authOptions);
  const viewerId = session?.user?.id ?? null;

  const profile = await prisma.user.findFirst({
    where: {
      OR: [{ handle: params.handle }, { id: params.handle }],
    },
    select: {
      id: true,
      name: true,
      handle: true,
      displayHandle: true,
      tier: true,
      role: true,
      display: true,
      bio: true,
      website: true,
      location: true,
      expertise: true,
      followerCount: true,
      followingCount: true,
      postCount: true,
      discussionCount: true,
      verifiedAt: true,
      verifiedDomains: true,
      verifiedDocs: true,
      isHistorical: true,
      legacySource: true,
      legacyWorksCount: true,
      createdAt: true,
      verifiedBy: {
        select: { id: true, name: true, handle: true, displayHandle: true },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const [isFollowing, followersPreviewRecords, followingPreviewRecords, viewerFollowingRecords] =
    await Promise.all([
      viewerId
        ? prisma.follow.findFirst({
            where: { followerId: viewerId, followeeUserId: profile.id },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.follow.findMany({
        where: { followeeUserId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          follower: {
            select: { id: true, name: true, handle: true, displayHandle: true, tier: true },
          },
        },
      }),
      prisma.follow.findMany({
        where: { followerId: profile.id, followeeUserId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          followeeUser: {
            select: { id: true, name: true, handle: true, displayHandle: true, tier: true },
          },
        },
      }),
      viewerId
        ? prisma.follow.findMany({
            where: { followerId: viewerId, followeeUserId: { not: null } },
            select: { followeeUserId: true },
          })
        : Promise.resolve([]),
    ]);

  const viewerFollowingIds = viewerFollowingRecords
    .map((record) => record.followeeUserId)
    .filter((id): id is string => Boolean(id));

  const mutualFollowsRecords = viewerFollowingIds.length
    ? await prisma.follow.findMany({
        where: { followerId: profile.id, followeeUserId: { in: viewerFollowingIds } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          followeeUser: {
            select: { id: true, name: true, handle: true, displayHandle: true, tier: true },
          },
        },
      })
    : [];

  const followersPreview = followersPreviewRecords
    .map((record) => record.follower)
    .filter((follower): follower is NonNullable<typeof follower> => Boolean(follower));
  const followingPreview = followingPreviewRecords
    .map((record) => record.followeeUser)
    .filter((followee): followee is NonNullable<typeof followee> => Boolean(followee));
  const mutualFollows = mutualFollowsRecords
    .map((record) => record.followeeUser)
    .filter((followee): followee is NonNullable<typeof followee> => Boolean(followee));

  const isSelf = viewerId === profile.id;

  return (
    <ProfilePageClient
      profile={{
        ...profile,
        displayName: profile.display ?? profile.name ?? profile.handle ?? 'Researcher',
        expertise: profile.expertise ?? [],
      }}
      followersPreview={followersPreview}
      followingPreview={followingPreview}
      mutualFollows={mutualFollows}
      initialFollowing={Boolean(isFollowing)}
      viewerId={viewerId}
      isSelf={isSelf}
    />
  );
}
