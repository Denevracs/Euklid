import { z } from 'zod';

export const tierSchema = z.enum(['TIER1', 'TIER2', 'TIER3', 'TIER4']);
export type Tier = z.infer<typeof tierSchema>;

export const voteTypeSchema = z.enum(['AGREE', 'DISAGREE', 'REPLICATE', 'CHALLENGE']);
export type VoteType = z.infer<typeof voteTypeSchema>;

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  display: z.string().nullable().optional(),
  handle: z.string().nullable().optional(),
  tier: tierSchema,
  role: z.string().nullable().optional(),
  isHistorical: z.boolean().optional().nullable(),
  verifiedDomains: z.array(z.string()).optional(),
  verifiedDocs: z.number().optional(),
  followers: z.number().optional(),
  followingUsers: z.number().optional(),
  followingDisciplines: z.number().optional(),
  isBanned: z.boolean().optional(),
  bannedUntil: z.string().nullable().optional(),
  warningsCount: z.number().optional(),
});

export const userSessionSchema = userSchema.extend({
  email: z.string().email().nullable().optional(),
  verifiedDomains: z.array(z.string()).default([]),
  verifiedDocs: z.number().default(0),
  verificationScore: z.number().default(0),
  lastTierEvalAt: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  isBanned: z.boolean().default(false),
  bannedUntil: z.string().nullable().optional(),
  warningsCount: z.number().default(0),
});

export const disciplineSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  book: z
    .object({ id: z.string(), title: z.string(), description: z.string().nullable().optional() })
    .optional()
    .nullable(),
});

export const nodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  statement: z.string(),
  type: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
  disciplineId: z.string().nullable().optional(),
  discipline: disciplineSchema.nullable().optional(),
  createdBy: userSchema.nullable().optional(),
});

export const voteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: voteTypeSchema,
  weight: z.number().default(0),
  createdAt: z.string(),
});

export const replySchema = z.object({
  id: z.string(),
  discussionId: z.string(),
  authorId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: userSchema.nullable().optional(),
});

export const discussionSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  authorId: z.string(),
  content: z.string(),
  hidden: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: userSchema.nullable().optional(),
  replies: z.array(replySchema).default([]),
  votes: z.array(voteSchema).default([]),
});

export const discussionsResponseSchema = z.array(discussionSchema);

export const voteTotalsSchema = z.object({
  discussionId: z.string(),
  totals: z.object({
    AGREE: z.number().default(0),
    DISAGREE: z.number().default(0),
    REPLICATE: z.number().default(0),
    CHALLENGE: z.number().default(0),
  }),
});

export type VoteTotals = z.infer<typeof voteTotalsSchema>;

export const feedDiscussionSchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  author: userSchema.nullable().optional(),
  node: nodeSchema.pick({ id: true, title: true }).nullable().optional(),
});

export const feedReplySchema = replySchema.extend({
  discussion: z
    .object({
      id: z.string(),
      nodeId: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export const feedSnapshotSchema = z.object({
  discussion: feedDiscussionSchema,
  score: z.number(),
});

export const feedResponseSchema = z.object({
  forUser: z.string().nullable(),
  discussions: z.array(feedDiscussionSchema),
  replies: z.array(feedReplySchema),
  mostActive: z.array(feedSnapshotSchema),
});

export const feedItemNodeSchema = z.object({
  kind: z.literal('NODE'),
  id: z.string(),
  score: z.number(),
  createdAt: z.string(),
  activityId: z.string(),
  node: z.object({
    id: z.string(),
    title: z.string(),
    statement: z.string().nullable(),
    createdAt: z.string(),
    discipline: disciplineSchema.pick({ id: true, title: true }).nullable(),
  }),
  author: userSchema.pick({ id: true, name: true, handle: true, tier: true }),
  edgesSummary: z.object({ incoming: z.number(), outgoing: z.number() }),
  discussionCount: z.number(),
});

export const feedItemDiscussionSchema = z.object({
  kind: z.literal('DISCUSSION'),
  id: z.string(),
  score: z.number(),
  createdAt: z.string(),
  activityId: z.string(),
  discussion: z.object({
    id: z.string(),
    content: z.string(),
    createdAt: z.string(),
    author: userSchema.pick({ id: true, name: true, handle: true, tier: true }),
    node: nodeSchema.pick({ id: true, title: true, discipline: true }).nullable(),
  }),
  latestReply: z
    .object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
      author: userSchema.pick({ id: true, name: true, handle: true, tier: true }),
    })
    .nullable(),
  repliesCount: z.number(),
});

export const feedItemEvidenceSchema = z.object({
  kind: z.literal('EVIDENCE'),
  id: z.string(),
  score: z.number(),
  createdAt: z.string(),
  activityId: z.string(),
  evidence: z.object({
    id: z.string(),
    summary: z.string(),
    kind: z.string(),
    createdAt: z.string(),
    node: nodeSchema.pick({ id: true, title: true }),
    author: userSchema.pick({ id: true, name: true, handle: true, tier: true }),
  }),
});

export const feedItemsSchema = z.union([
  feedItemNodeSchema,
  feedItemDiscussionSchema,
  feedItemEvidenceSchema,
]);

export const feedPageSchema = z.object({
  items: z.array(feedItemsSchema),
  nextCursor: z.string().nullable(),
});

export const verificationStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export const verificationTypeSchema = z.enum([
  'EMAIL_DOMAIN',
  'INSTITUTION_ID',
  'DOCUMENT_ORG',
  'PEER_ENDORSE',
  'ORCID',
  'SCHOLAR_PROFILE',
]);

export const verificationSubmissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: verificationTypeSchema,
  status: verificationStatusSchema,
  payload: z.record(z.any()).default({}),
  reviewerId: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const verificationSubmissionWithUserSchema = verificationSubmissionSchema.extend({
  user: userSessionSchema.optional().nullable(),
});

export const verificationMineSchema = z.object({
  submissions: z.array(verificationSubmissionSchema),
});

export const authMeResponseSchema = z.object({
  user: userSessionSchema.nullable(),
});

export const verificationQueueResponseSchema = z.object({
  submissions: z.array(verificationSubmissionWithUserSchema),
  nextCursor: z.string().nullable(),
});

export const verificationDecisionResponseSchema = z.object({
  submission: verificationSubmissionSchema,
  verifiedDomains: z.array(z.string()).default([]),
  verifiedDocs: z.number().default(0),
  tier: tierSchema,
  verificationScore: z.number(),
});

export const emailVerificationResponseSchema = z.object({
  message: z.string(),
  devCode: z.string().optional(),
  candidateTier: tierSchema.nullable().optional(),
});

export const emailVerificationCompleteSchema = z.object({
  message: z.string(),
  verifiedDomains: z.array(z.string()),
  tier: tierSchema,
  verificationScore: z.number(),
  candidateTier: tierSchema.nullable().optional(),
});

export const endorsementSummarySchema = z.object({
  userId: z.string(),
  count: z.number(),
  totalWeight: z.number(),
  recent: z
    .array(
      z.object({
        id: z.string(),
        endorserId: z.string(),
        endorseedId: z.string(),
        weight: z.number(),
        note: z.string().nullable().optional(),
        createdAt: z.string(),
      })
    )
    .default([]),
});

export const followListItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  user: userSchema.pick({ id: true, name: true, handle: true, tier: true }).nullable(),
  discipline: disciplineSchema.pick({ id: true, title: true, description: true }).nullable(),
});

export const followListResponseSchema = z.object({
  items: z.array(followListItemSchema),
  nextCursor: z.string().nullable(),
});

export const flagSchema = z.object({
  id: z.string(),
  reporterId: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string(),
  status: z.string(),
  createdAt: z.string(),
  reviewedById: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  decisionNote: z.string().nullable(),
});

export const moderationEventSchema = z.object({
  id: z.string(),
  actorId: z.string(),
  targetUserId: z.string().nullable(),
  targetType: z.string(),
  targetId: z.string(),
  action: z.string(),
  reason: z.string().nullable(),
  note: z.string().nullable(),
  weight: z.number(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
});

export const moderationSummarySchema = z.object({
  warnings: z.number(),
  bans: z.number(),
  mutes: z.number(),
  isBanned: z.boolean(),
  bannedUntil: z.string().nullable(),
  activeFlags: z.number(),
  recentEvents: z.array(moderationEventSchema),
});

export const moderationStatsSchema = z.object({
  flagsReviewed: z.number(),
  activeBans: z.number(),
  pendingFlags: z.number(),
});

export const adminUserSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  handle: z.string().nullable(),
  displayHandle: z.string().nullable(),
  tier: z.string(),
  role: z.string(),
  isHistorical: z.boolean(),
  isBanned: z.boolean(),
  verifiedAt: z.string().nullable(),
  verifiedById: z.string().nullable(),
  lastLoginAt: z.string().nullable(),
  followerCount: z.number(),
  followingCount: z.number(),
  postCount: z.number(),
  discussionCount: z.number(),
  legacySource: z.string().nullable(),
  legacyWorksCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const adminUsersResponseSchema = z.object({
  items: z.array(adminUserSummarySchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const adminUserDetailSchema = z.object({
  user: adminUserSummarySchema.extend({
    bio: z.string().nullable(),
    website: z.string().nullable(),
    location: z.string().nullable(),
    expertise: z.array(z.string()).default([]),
    verifiedBy: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        handle: z.string().nullable(),
        displayHandle: z.string().nullable(),
      })
      .nullable()
      .optional(),
  }),
  moderationEvents: z.array(moderationEventSchema),
  verificationSubmissions: z.array(verificationSubmissionSchema),
  recentNodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      createdAt: z.string(),
      statement: z.string().nullable().optional(),
    })
  ),
  recentDiscussions: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
      nodeId: z.string().nullable().optional(),
    })
  ),
  endorsements: z.array(
    z.object({
      id: z.string(),
      weight: z.number(),
      note: z.string().nullable(),
      createdAt: z.string(),
      endorser: z.object({
        id: z.string(),
        name: z.string().nullable(),
        handle: z.string().nullable(),
        displayHandle: z.string().nullable(),
        tier: z.string(),
      }),
    })
  ),
});

export const adminSettingsSchema = z.object({
  settings: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      value: z.unknown(),
      updatedAt: z.string(),
      createdAt: z.string(),
    })
  ),
});

export const auditLogSchema = z.object({
  id: z.string(),
  actorId: z.string().nullable(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  meta: z.unknown().nullable(),
  createdAt: z.string(),
  actor: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      handle: z.string().nullable(),
      displayHandle: z.string().nullable(),
      role: z.string(),
    })
    .nullable()
    .optional(),
});

export const adminAuditResponseSchema = z.object({
  items: z.array(auditLogSchema),
  nextCursor: z.string().nullable(),
});

export const adminAnalyticsSchema = z.object({
  topPosters: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      handle: z.string().nullable(),
      displayHandle: z.string().nullable(),
      tier: z.string(),
      postCount: z.number(),
    })
  ),
  topDiscussants: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      handle: z.string().nullable(),
      displayHandle: z.string().nullable(),
      tier: z.string(),
      discussionCount: z.number(),
    })
  ),
  topFollowed: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      handle: z.string().nullable(),
      displayHandle: z.string().nullable(),
      tier: z.string(),
      followerCount: z.number(),
    })
  ),
  tierBreakdown: z.array(
    z.object({
      tier: z.string(),
      _sum: z.object({
        postCount: z.number().nullable(),
        discussionCount: z.number().nullable(),
        followerCount: z.number().nullable(),
      }),
    })
  ),
  weeklyGrowth: z.array(z.object({ week: z.string(), count: z.number() })),
});

export const publicProfileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  handle: z.string().nullable(),
  displayHandle: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  expertise: z.array(z.string()).default([]),
  followerCount: z.number(),
  followingCount: z.number(),
  postCount: z.number(),
  discussionCount: z.number(),
  tier: z.string(),
  role: z.string(),
  isHistorical: z.boolean(),
  legacySource: z.string().nullable(),
  legacyWorksCount: z.number(),
  verifiedAt: z.string().nullable(),
  verifiedDocs: z.number().default(0),
  verifiedDomains: z.array(z.string()).default([]),
  verifiedBy: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      handle: z.string().nullable(),
      displayHandle: z.string().nullable(),
    })
    .nullable()
    .optional(),
  createdAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export const profileResponseSchema = z.object({
  user: publicProfileSchema,
  followersPreview: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        handle: z.string().nullable(),
        displayHandle: z.string().nullable(),
        tier: z.string(),
      })
    )
    .default([]),
  followingPreview: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().nullable(),
        handle: z.string().nullable(),
        displayHandle: z.string().nullable(),
        tier: z.string(),
      })
    )
    .default([]),
});

export const profileActivitySchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      statement: z.string().nullable().optional(),
      status: z.string(),
      createdAt: z.string(),
    })
  ),
  discussions: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
      nodeId: z.string().nullable().optional(),
    })
  ),
  endorsements: z.array(
    z.object({
      id: z.string(),
      weight: z.number(),
      note: z.string().nullable(),
      createdAt: z.string(),
      endorseed: z.object({
        id: z.string(),
        name: z.string().nullable(),
        handle: z.string().nullable(),
        displayHandle: z.string().nullable(),
      }),
    })
  ),
});
export type NodeDTO = z.infer<typeof nodeSchema>;
export type DiscussionDTO = z.infer<typeof discussionSchema>;
export type ReplyDTO = z.infer<typeof replySchema>;
export type FeedResponse = z.infer<typeof feedResponseSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
export type FeedResponseItem = z.infer<typeof feedItemsSchema>;
export type VerificationSubmission = z.infer<typeof verificationSubmissionSchema>;
export type VerificationSubmissionWithUser = z.infer<typeof verificationSubmissionWithUserSchema>;
export type VerificationQueueResponse = z.infer<typeof verificationQueueResponseSchema>;
export type VerificationDecisionResponse = z.infer<typeof verificationDecisionResponseSchema>;
export type EmailVerificationResponse = z.infer<typeof emailVerificationResponseSchema>;
export type EmailVerificationCompleteResponse = z.infer<typeof emailVerificationCompleteSchema>;
export type UserSession = z.infer<typeof userSessionSchema>;
export type VerificationType = z.infer<typeof verificationTypeSchema>;
export type FollowListItem = z.infer<typeof followListItemSchema>;
export type FollowListResponse = z.infer<typeof followListResponseSchema>;
export type FlagDTO = z.infer<typeof flagSchema>;
export type ModerationEventDTO = z.infer<typeof moderationEventSchema>;
export type ModerationSummary = z.infer<typeof moderationSummarySchema>;
export type ModerationStats = z.infer<typeof moderationStatsSchema>;
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>;
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
export type AdminUserDetail = z.infer<typeof adminUserDetailSchema>;
export type AdminSettingsResponse = z.infer<typeof adminSettingsSchema>;
export type AuditLogEntry = z.infer<typeof auditLogSchema>;
export type AdminAuditResponse = z.infer<typeof adminAuditResponseSchema>;
export type AdminAnalytics = z.infer<typeof adminAnalyticsSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type ProfileActivity = z.infer<typeof profileActivitySchema>;
