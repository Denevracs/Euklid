import { describe, expect, it } from 'vitest';
import { ActivityAction, Tier } from '@prisma/client';
import { __test__ as feedTestExports } from '../feed';

const { computeScore, freshnessDecay } = feedTestExports;

type CandidateLike = Parameters<typeof computeScore>[0];
type FeedContext = Parameters<typeof computeScore>[1];

const makeActivity = (overrides: Partial<CandidateLike> = {}): CandidateLike => {
  const createdAt = overrides.createdAt ?? new Date();
  return {
    id: 'activity-1',
    actorId: 'actor-1',
    action: ActivityAction.CREATE_NODE,
    targetNodeId: 'node-1',
    targetDiscussionId: null,
    targetUserId: null,
    targetDisciplineId: 'disc-1',
    targetEvidenceId: null,
    weight: 5,
    createdAt,
    actor: {
      id: 'actor-1',
      name: 'Ada Lovelace',
      handle: 'ada',
      tier: Tier.TIER4,
      ...((overrides.actor as Record<string, unknown>) ?? {}),
    },
    targetNode: {
      id: 'node-1',
      title: 'Prime gap heuristics',
      statement: 'Baseline statement',
      createdAt: createdAt,
      disciplineId: 'disc-1',
      createdBy: {
        id: 'author-1',
        name: 'Author',
        handle: 'author',
        tier: Tier.TIER3,
      },
      discipline: {
        id: 'disc-1',
        title: 'Number Theory',
      },
      ...((overrides.targetNode as Record<string, unknown>) ?? {}),
    },
    targetDiscussion: null,
    targetUser: null,
    targetDiscipline: {
      id: 'disc-1',
      title: 'Number Theory',
    },
    targetEvidence: null,
    ...overrides,
  } as CandidateLike;
};

const makeContext = (overrides: Partial<FeedContext> = {}): FeedContext => {
  return {
    viewerTier: Tier.TIER3,
    followedUserIds: new Set<string>(),
    followedDisciplineIds: new Set<string>(),
    actorFrequency: new Map<string, number>([['actor-1', 1]]),
    discussionReplies: new Map<string, number>(),
    discussionSupports: new Map<string, number>(),
    nodeDiscussionCount: new Map<string, number>([['node-1', 2]]),
    nodeEdgeSummary: new Map<string, { incoming: number; outgoing: number }>([
      ['node-1', { incoming: 3, outgoing: 1 }],
    ]),
    actorEndorsements: new Map<string, number>([['actor-1', 4]]),
    ...overrides,
  };
};

describe('feed service scoring helpers', () => {
  it('boosts scores for higher-tier followed authors', () => {
    const baseActivity = makeActivity();
    const boostedActivity = makeActivity({
      actor: { tier: Tier.TIER1 },
    });

    const baseContext = makeContext();
    const followedContext = makeContext({
      followedUserIds: new Set<string>(['actor-1']),
      followedDisciplineIds: new Set<string>(['disc-1']),
    });

    const baselineScore = computeScore(baseActivity, baseContext);
    const followedScore = computeScore(baseActivity, followedContext);
    const tierBoostedScore = computeScore(boostedActivity, followedContext);

    expect(followedScore).toBeGreaterThan(baselineScore);
    expect(tierBoostedScore).toBeGreaterThan(followedScore);
  });

  it('applies freshness decay for older activities', () => {
    const recent = new Date();
    const stale = new Date(Date.now() - 72 * 60 * 60 * 1000);

    expect(freshnessDecay(recent)).toBeGreaterThan(freshnessDecay(stale));
    expect(freshnessDecay(stale)).toBeGreaterThan(0);
  });
});
