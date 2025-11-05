import type { Prisma, PrismaClient, Tier } from '@prisma/client';
import { ActivityAction, Tier as TierEnum } from '@prisma/client';

export type FeedItemKind = 'NODE' | 'DISCUSSION' | 'EVIDENCE';

export type FeedItemNode = {
  kind: 'NODE';
  id: string;
  score: number;
  createdAt: string;
  activityId: string;
  node: {
    id: string;
    title: string;
    statement: string | null;
    createdAt: string;
    discipline: { id: string; title: string } | null;
  };
  author: {
    id: string;
    name: string | null;
    handle: string | null;
    tier: Tier;
  };
  edgesSummary: {
    incoming: number;
    outgoing: number;
  };
  discussionCount: number;
};

export type FeedItemDiscussion = {
  kind: 'DISCUSSION';
  id: string;
  score: number;
  createdAt: string;
  activityId: string;
  discussion: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
      handle: string | null;
      tier: Tier;
    };
    node: {
      id: string;
      title: string;
      discipline: { id: string; title: string } | null;
    } | null;
  };
  latestReply: {
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      name: string | null;
      handle: string | null;
      tier: Tier;
    };
  } | null;
  repliesCount: number;
};

export type FeedItemEvidence = {
  kind: 'EVIDENCE';
  id: string;
  score: number;
  createdAt: string;
  activityId: string;
  evidence: {
    id: string;
    summary: string;
    kind: string;
    createdAt: string;
    node: {
      id: string;
      title: string;
    };
    author: {
      id: string;
      name: string | null;
      handle: string | null;
      tier: Tier;
    };
  };
};

export type FeedResponseItem = FeedItemNode | FeedItemDiscussion | FeedItemEvidence;

export type FeedResult = {
  items: FeedResponseItem[];
  nextCursor: string | null;
};

const TIER_WEIGHT: Record<Tier, number> = {
  [TierEnum.TIER1]: 1.5,
  [TierEnum.TIER2]: 1.2,
  [TierEnum.TIER3]: 1.05,
  [TierEnum.TIER4]: 1.0,
};

const relationBoostWeight = 1.2;
const disciplineBoostWeight = 1.1;
const DEFAULT_WINDOW_DAYS = 7;
const GLOBAL_WINDOW_HOURS = 48;

const BASE_LIMIT = 60;

type CursorPayload = {
  score: number;
  createdAt: string;
  activityId: string;
};

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeCursor(value: string | null | undefined): CursorPayload | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8')) as CursorPayload;
  } catch (error) {
    return null;
  }
}

function compareCursor(a: CursorPayload, b: CursorPayload): number {
  if (a.score !== b.score) {
    return a.score > b.score ? -1 : 1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt > b.createdAt ? -1 : 1;
  }
  return a.activityId.localeCompare(b.activityId);
}

function freshnessDecay(createdAt: Date): number {
  const hours = (Date.now() - createdAt.getTime()) / 36e5;
  const decay = Math.max(0, 1 - hours / 72);
  return Math.max(decay, 0.1);
}

function sevenDaysAgo(): Date {
  const date = new Date();
  date.setDate(date.getDate() - DEFAULT_WINDOW_DAYS);
  return date;
}

function hoursAgo(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
}

type Candidate = Prisma.ActivityGetPayload<{
  include: {
    actor: true;
    targetNode: true;
    targetDiscussion: { include: { node: true; author: true } };
    targetUser: true;
    targetDiscipline: true;
    targetEvidence: { include: { node: true; addedBy: true } };
  };
}>;

type FeedContext = {
  viewerTier: Tier;
  followedUserIds: Set<string>;
  followedDisciplineIds: Set<string>;
  actorFrequency: Map<string, number>;
  discussionReplies: Map<string, number>;
  discussionSupports: Map<string, number>;
  nodeDiscussionCount: Map<string, number>;
  nodeEdgeSummary: Map<string, { incoming: number; outgoing: number }>;
  actorEndorsements: Map<string, number>;
};

function computeScore(activity: Candidate, context: FeedContext): number {
  const baseTierWeight = TIER_WEIGHT[activity.actor?.tier ?? TierEnum.TIER4];
  const relationBoost = context.followedUserIds.has(activity.actorId) ? relationBoostWeight : 1;

  let disciplineBoost = 1;
  const nodeDiscipline =
    activity.targetNode?.disciplineId ??
    activity.targetDiscussion?.node?.disciplineId ??
    activity.targetDiscipline?.id;
  if (nodeDiscipline && context.followedDisciplineIds.has(nodeDiscipline)) {
    disciplineBoost = disciplineBoostWeight;
  }

  const actorCount = context.actorFrequency.get(activity.actorId) ?? 1;
  const balance = 1 / Math.sqrt(actorCount);

  let replies = 0;
  let supports = 0;
  if (activity.targetDiscussionId) {
    replies = context.discussionReplies.get(activity.targetDiscussionId) ?? 0;
    supports = context.discussionSupports.get(activity.targetDiscussionId) ?? 0;
  }

  if (activity.targetNodeId) {
    const discussionCount = context.nodeDiscussionCount.get(activity.targetNodeId) ?? 0;
    replies += discussionCount * 0.5;
  }

  const endorsements = context.actorEndorsements.get(activity.actorId) ?? 0;
  const engagementBase = Math.log1p(
    activity.weight + replies * 2 + supports * 3 + endorsements * 2
  );
  const freshness = freshnessDecay(activity.createdAt);

  const baseScore = engagementBase + freshness;
  const finalScore = baseScore * baseTierWeight * relationBoost * disciplineBoost * balance;
  return Number.isFinite(finalScore) ? finalScore : 0;
}

function paginate(
  items: Array<{ score: number; activityId: string; createdAt: Date; payload: FeedResponseItem }>,
  limit: number,
  cursor?: string | null
): FeedResult {
  const sorted = items.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.createdAt.getTime() !== b.createdAt.getTime())
      return b.createdAt.getTime() - a.createdAt.getTime();
    return a.activityId.localeCompare(b.activityId);
  });

  const decoded = decodeCursor(cursor);
  let startIndex = 0;
  if (decoded) {
    startIndex = sorted.findIndex(
      (item) =>
        compareCursor(
          {
            score: item.score,
            createdAt: item.createdAt.toISOString(),
            activityId: item.activityId,
          },
          decoded
        ) === 1
    );
    if (startIndex === -1) {
      startIndex = sorted.length;
    }
  }

  const page = sorted.slice(startIndex, startIndex + limit);
  const lastItem = page[page.length - 1];
  return {
    items: page.map((entry) => entry.payload),
    nextCursor:
      page.length === limit && lastItem
        ? encodeCursor({
            score: lastItem.score,
            createdAt: lastItem.createdAt.toISOString(),
            activityId: lastItem.activityId,
          })
        : null,
  };
}

async function buildActivities(prisma: PrismaClient, userId: string) {
  const followRecords = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followeeUserId: true, followDisciplineId: true },
  });

  const followedUserIds = new Set<string>();
  const followedDisciplineIds = new Set<string>();
  for (const record of followRecords) {
    if (record.followeeUserId) followedUserIds.add(record.followeeUserId);
    if (record.followDisciplineId) followedDisciplineIds.add(record.followDisciplineId);
  }

  const since = sevenDaysAgo();

  const activities = await prisma.activity.findMany({
    where: {
      createdAt: { gte: since },
      OR: [
        { actorId: { in: Array.from(followedUserIds) } },
        { targetDisciplineId: { in: Array.from(followedDisciplineIds) } },
        {
          targetNode: {
            is: {
              createdById: { in: Array.from(followedUserIds) },
            },
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: BASE_LIMIT,
    include: {
      actor: { select: { id: true, name: true, handle: true, tier: true } },
      targetNode: {
        select: {
          id: true,
          title: true,
          statement: true,
          createdAt: true,
          disciplineId: true,
          createdBy: { select: { id: true, name: true, handle: true, tier: true } },
          discipline: { select: { id: true, title: true } },
        },
      },
      targetDiscussion: {
        include: {
          node: {
            select: { id: true, title: true, discipline: { select: { id: true, title: true } } },
          },
          author: { select: { id: true, name: true, handle: true, tier: true } },
        },
      },
      targetUser: { select: { id: true, name: true, handle: true, tier: true } },
      targetDiscipline: { select: { id: true, title: true } },
      targetEvidence: {
        include: {
          node: { select: { id: true, title: true } },
          addedBy: { select: { id: true, name: true, handle: true, tier: true } },
        },
      },
    },
  });

  return { activities, followedUserIds, followedDisciplineIds };
}

async function buildContext(
  prisma: PrismaClient,
  activities: Candidate[]
): Promise<{
  discussionReplies: Map<string, number>;
  discussionSupports: Map<string, number>;
  nodeDiscussionCount: Map<string, number>;
  nodeEdgeSummary: Map<string, { incoming: number; outgoing: number }>;
  actorEndorsements: Map<string, number>;
}> {
  const discussionIds = new Set<string>();
  const nodeIds = new Set<string>();
  const actorIds = new Set<string>();

  for (const activity of activities) {
    actorIds.add(activity.actorId);
    if (activity.targetDiscussionId) {
      discussionIds.add(activity.targetDiscussionId);
    }
    if (activity.targetNodeId) {
      nodeIds.add(activity.targetNodeId);
    }
    if (activity.targetDiscussion?.nodeId) {
      nodeIds.add(activity.targetDiscussion.nodeId);
    }
  }

  const [
    discussionReplyGroups,
    discussionSupportGroups,
    nodeDiscussionGroups,
    incomingEdges,
    outgoingEdges,
    actorEndorseGroups,
  ] = await Promise.all([
    discussionIds.size
      ? prisma.reply.groupBy({
          by: ['discussionId'],
          where: { discussionId: { in: Array.from(discussionIds) } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    discussionIds.size
      ? prisma.vote.groupBy({
          by: ['discussionId'],
          where: { discussionId: { in: Array.from(discussionIds) }, type: 'AGREE' },
          _sum: { weight: true },
        })
      : Promise.resolve([]),
    nodeIds.size
      ? prisma.discussion.groupBy({
          by: ['nodeId'],
          where: { nodeId: { in: Array.from(nodeIds) }, hidden: false },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    nodeIds.size
      ? prisma.edge.groupBy({
          by: ['toId'],
          where: { toId: { in: Array.from(nodeIds) } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    nodeIds.size
      ? prisma.edge.groupBy({
          by: ['fromId'],
          where: { fromId: { in: Array.from(nodeIds) } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    actorIds.size
      ? prisma.endorsement.groupBy({
          by: ['endorseedId'],
          where: { endorseedId: { in: Array.from(actorIds) } },
          _sum: { weight: true },
        })
      : Promise.resolve([]),
  ]);

  const discussionReplies = new Map<string, number>();
  for (const group of discussionReplyGroups) {
    discussionReplies.set(group.discussionId, group._count._all ?? 0);
  }

  const discussionSupports = new Map<string, number>();
  for (const group of discussionSupportGroups) {
    discussionSupports.set(group.discussionId, group._sum.weight ?? 0);
  }

  const nodeDiscussionCount = new Map<string, number>();
  for (const group of nodeDiscussionGroups) {
    nodeDiscussionCount.set(group.nodeId, group._count._all ?? 0);
  }

  const nodeEdgeSummary = new Map<string, { incoming: number; outgoing: number }>();
  for (const group of incomingEdges) {
    const previous = nodeEdgeSummary.get(group.toId) ?? { incoming: 0, outgoing: 0 };
    nodeEdgeSummary.set(group.toId, { ...previous, incoming: group._count._all ?? 0 });
  }
  for (const group of outgoingEdges) {
    const previous = nodeEdgeSummary.get(group.fromId) ?? { incoming: 0, outgoing: 0 };
    nodeEdgeSummary.set(group.fromId, { ...previous, outgoing: group._count._all ?? 0 });
  }

  const actorEndorsements = new Map<string, number>();
  for (const group of actorEndorseGroups) {
    actorEndorsements.set(group.endorseedId, group._sum.weight ?? 0);
  }

  return {
    discussionReplies,
    discussionSupports,
    nodeDiscussionCount,
    nodeEdgeSummary,
    actorEndorsements,
  };
}

function toNodeItem(activity: Candidate, score: number): FeedItemNode | null {
  if (!activity.targetNode) return null;
  const node = activity.targetNode;
  const author = node.createdBy;
  if (!author) return null;

  return {
    kind: 'NODE',
    id: node.id,
    score,
    createdAt: activity.createdAt.toISOString(),
    activityId: activity.id,
    node: {
      id: node.id,
      title: node.title,
      statement: node.statement,
      createdAt: node.createdAt.toISOString(),
      discipline: node.discipline ? { id: node.discipline.id, title: node.discipline.title } : null,
    },
    author: {
      id: author.id,
      name: author.name,
      handle: author.handle,
      tier: author.tier,
    },
    edgesSummary: { incoming: 0, outgoing: 0 },
    discussionCount: 0,
  };
}

function toDiscussionItem(activity: Candidate, score: number): FeedItemDiscussion | null {
  const discussion = activity.targetDiscussion;
  if (!discussion) return null;

  return {
    kind: 'DISCUSSION',
    id: discussion.id,
    score,
    createdAt: activity.createdAt.toISOString(),
    activityId: activity.id,
    discussion: {
      id: discussion.id,
      content: discussion.content,
      createdAt: discussion.createdAt.toISOString(),
      author: {
        id: discussion.authorId,
        name: discussion.author?.name ?? null,
        handle: discussion.author?.handle ?? null,
        tier: discussion.author?.tier ?? TierEnum.TIER4,
      },
      node: discussion.node
        ? {
            id: discussion.node.id,
            title: discussion.node.title,
            discipline: discussion.node.discipline
              ? { id: discussion.node.discipline.id, title: discussion.node.discipline.title }
              : null,
          }
        : null,
    },
    latestReply: null,
    repliesCount: 0,
  };
}

function toEvidenceItem(activity: Candidate, score: number): FeedItemEvidence | null {
  const evidence = activity.targetEvidence;
  if (!evidence) return null;

  return {
    kind: 'EVIDENCE',
    id: evidence.id,
    score,
    createdAt: activity.createdAt.toISOString(),
    activityId: activity.id,
    evidence: {
      id: evidence.id,
      summary: evidence.summary,
      kind: evidence.kind,
      createdAt: evidence.createdAt.toISOString(),
      node: {
        id: evidence.nodeId,
        title: evidence.node?.title ?? 'Untitled node',
      },
      author: {
        id: evidence.addedById,
        name: evidence.addedBy?.name ?? null,
        handle: evidence.addedBy?.handle ?? null,
        tier: evidence.addedBy?.tier ?? TierEnum.TIER4,
      },
    },
  };
}

async function hydrateFeedItems(
  prisma: PrismaClient,
  activities: Candidate[],
  context: FeedContext
): Promise<
  Array<{ score: number; activityId: string; createdAt: Date; payload: FeedResponseItem }>
> {
  const items: Array<{
    score: number;
    activityId: string;
    createdAt: Date;
    payload: FeedResponseItem;
  }> = [];

  const latestReplyIds = new Set<string>();
  for (const activity of activities) {
    if (activity.targetDiscussionId) {
      latestReplyIds.add(activity.targetDiscussionId);
    }
  }

  const latestRepliesRaw = latestReplyIds.size
    ? await prisma.reply.findMany({
        where: {
          discussionId: { in: Array.from(latestReplyIds) },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, name: true, handle: true, tier: true } },
        },
        take: latestReplyIds.size * 3,
      })
    : [];

  const latestReplyMap = new Map<string, (typeof latestRepliesRaw)[number]>();
  for (const reply of latestRepliesRaw) {
    if (!latestReplyMap.has(reply.discussionId)) {
      latestReplyMap.set(reply.discussionId, reply);
    }
  }

  for (const activity of activities) {
    const score = computeScore(activity, context);
    let payload: FeedResponseItem | null = null;

    switch (activity.action) {
      case ActivityAction.CREATE_NODE:
      case ActivityAction.UPDATE_NODE:
        payload = toNodeItem(activity, score);
        break;
      case ActivityAction.CREATE_DISCUSSION:
      case ActivityAction.REPLY:
      case ActivityAction.VOTE:
      case ActivityAction.SUPPORT:
      case ActivityAction.CHALLENGE:
      case ActivityAction.CONTRADICT:
      case ActivityAction.CITE:
        payload = toDiscussionItem(activity, score);
        break;
      case ActivityAction.ADD_EVIDENCE:
      case ActivityAction.ENDORSE:
        payload = toEvidenceItem(activity, score);
        break;
      default:
        break;
    }

    if (!payload) continue;

    if (payload.kind === 'NODE') {
      const summary = context.nodeEdgeSummary.get(payload.node.id) ?? { incoming: 0, outgoing: 0 };
      payload.edgesSummary = summary;
      payload.discussionCount = context.nodeDiscussionCount.get(payload.node.id) ?? 0;
    } else if (payload.kind === 'DISCUSSION') {
      payload.repliesCount = context.discussionReplies.get(payload.discussion.id) ?? 0;
      const latest = latestReplyMap.get(payload.discussion.id);
      payload.latestReply = latest
        ? {
            id: latest.id,
            content: latest.content,
            createdAt: latest.createdAt.toISOString(),
            author: {
              id: latest.authorId,
              name: latest.author?.name ?? null,
              handle: latest.author?.handle ?? null,
              tier: latest.author?.tier ?? TierEnum.TIER4,
            },
          }
        : null;
    }

    items.push({ score, activityId: activity.id, createdAt: activity.createdAt, payload });
  }

  return items;
}

export async function getFeed(
  prisma: PrismaClient,
  userId: string,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<FeedResult> {
  const limit = Math.min(Math.max(options.limit ?? 30, 5), 100);

  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  const viewerTier = viewer?.tier ?? TierEnum.TIER4;

  const { activities, followedUserIds, followedDisciplineIds } = await buildActivities(
    prisma,
    userId
  );
  if (!activities.length) {
    return getGlobalFeed(prisma, { limit });
  }

  const actorFrequency = new Map<string, number>();
  for (const activity of activities) {
    actorFrequency.set(activity.actorId, (actorFrequency.get(activity.actorId) ?? 0) + 1);
  }

  const aggregates = await buildContext(prisma, activities);

  const context: FeedContext = {
    viewerTier,
    followedUserIds,
    followedDisciplineIds,
    actorFrequency,
    ...aggregates,
  };

  const hydrated = await hydrateFeedItems(prisma, activities, context);
  return paginate(hydrated, limit, options.cursor);
}

export async function getGlobalFeed(
  prisma: PrismaClient,
  options: { limit?: number; cursor?: string | null } = {}
): Promise<FeedResult> {
  const limit = Math.min(Math.max(options.limit ?? 30, 5), 100);
  const since = hoursAgo(GLOBAL_WINDOW_HOURS);

  const activities = await prisma.activity.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: BASE_LIMIT,
    include: {
      actor: { select: { id: true, name: true, handle: true, tier: true } },
      targetNode: {
        select: {
          id: true,
          title: true,
          statement: true,
          createdAt: true,
          disciplineId: true,
          createdBy: { select: { id: true, name: true, handle: true, tier: true } },
          discipline: { select: { id: true, title: true } },
        },
      },
      targetDiscussion: {
        include: {
          node: {
            select: { id: true, title: true, discipline: { select: { id: true, title: true } } },
          },
          author: { select: { id: true, name: true, handle: true, tier: true } },
        },
      },
      targetUser: { select: { id: true, name: true, handle: true, tier: true } },
      targetDiscipline: { select: { id: true, title: true } },
      targetEvidence: {
        include: {
          node: { select: { id: true, title: true } },
          addedBy: { select: { id: true, name: true, handle: true, tier: true } },
        },
      },
    },
  });

  const actorFrequency = new Map<string, number>();
  for (const activity of activities) {
    actorFrequency.set(activity.actorId, (actorFrequency.get(activity.actorId) ?? 0) + 1);
  }

  const aggregates = await buildContext(prisma, activities);
  const context: FeedContext = {
    viewerTier: TierEnum.TIER4,
    followedUserIds: new Set<string>(),
    followedDisciplineIds: new Set<string>(),
    actorFrequency,
    ...aggregates,
  };

  const hydrated = await hydrateFeedItems(prisma, activities, context);
  return paginate(hydrated, limit, options.cursor);
}

export async function writeFeedCache(
  prisma: PrismaClient,
  ownerId: string,
  items: FeedResponseItem[],
  ttlHours = 2
) {
  if (!items.length) return;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await prisma.feedItem.createMany({
    data: items.map((item) => ({
      ownerId,
      kind: item.kind,
      refId: item.id,
      score: item.score,
      payload: item,
      expiresAt,
    })),
    skipDuplicates: true,
  });
}

export const __test__ = {
  computeScore,
  freshnessDecay,
};
