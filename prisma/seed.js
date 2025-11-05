const {
  PrismaClient,
  ActivityAction,
  EvidenceKind,
  NodeStatus,
  NodeType,
  Tier,
  UserRole,
  VoteType,
  VerificationStatus,
  VerificationType,
} = require('@prisma/client');

const prisma = new PrismaClient();

async function ensureTierEnum() {
  await prisma.$executeRawUnsafe(`
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReputationTier') THEN
      ALTER TABLE "User" ALTER COLUMN "tier" DROP DEFAULT;
      ALTER TABLE "User" ALTER COLUMN "tier" TYPE "Tier" USING ("tier"::text::"Tier");
      ALTER TABLE "User" ALTER COLUMN "tier" SET DEFAULT 'TIER4';
      DROP TYPE IF EXISTS "ReputationTier";
    END IF;
  END
  $$;
  `);
}

async function refreshUserStats() {
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const { id } of allUsers) {
    const [postCount, discussionCount, followerCount, followingUsers, followingDisciplines] =
      await Promise.all([
        prisma.node.count({ where: { createdById: id } }),
        prisma.discussion.count({ where: { authorId: id } }),
        prisma.follow.count({ where: { followeeUserId: id } }),
        prisma.follow.count({ where: { followerId: id, followeeUserId: { not: null } } }),
        prisma.follow.count({ where: { followerId: id, followDisciplineId: { not: null } } }),
      ]);

    await prisma.user.update({
      where: { id },
      data: {
        postCount,
        discussionCount,
        followerCount,
        followingCount: followingUsers + followingDisciplines,
      },
    });
  }
}

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.adminSetting.deleteMany();
  await prisma.moderationEvent.deleteMany();
  await prisma.flag.deleteMany();
  await prisma.endorsement.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.verificationSubmission.deleteMany();
  await prisma.userInstitution.deleteMany();
  await prisma.reputationHistory.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.reply.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.consensusVote.deleteMany();
  await prisma.consensusSnapshot.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.note.deleteMany();
  await prisma.derivation.deleteMany();
  await prisma.edge.deleteMany();
  await prisma.userReputation.deleteMany();
  await prisma.roleAssignment.deleteMany();
  await prisma.node.deleteMany();
  await prisma.ghostReservation.deleteMany();
  await prisma.discipline.deleteMany();
  await prisma.book.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();
}

function getRequired(map, key) {
  const value = map.get(key);
  if (!value) {
    throw new Error(`Missing seed value for key ${key}`);
  }
  return value;
}

async function main() {
  console.log('🌱 Seeding Euclid Network phase 1 data...');

  await ensureTierEnum();
  await resetDatabase();

  const books = [
    {
      title: 'Mathematics',
      description: 'Structures, quantity, and space.',
      disciplines: [
        { title: 'Geometry', description: 'Classical deductive geometry.' },
        { title: 'Number Theory', description: 'Properties of integers and primes.' },
      ],
    },
    {
      title: 'Physics',
      description: 'Nature and properties of matter and energy.',
      disciplines: [
        { title: 'Relativity', description: 'Space-time and gravitation.' },
        { title: 'Quantum Mechanics', description: 'Microscopic physical phenomena.' },
      ],
    },
    {
      title: 'Chemistry',
      description: 'Composition, properties, and behavior of substances.',
      disciplines: [{ title: 'Organic Chemistry' }, { title: 'Physical Chemistry' }],
    },
    {
      title: 'Biology',
      description: 'Life and living organisms.',
      disciplines: [{ title: 'Genetics' }, { title: 'Neuroscience' }],
    },
    {
      title: 'Information Systems',
      description: 'Computation, data, and algorithms.',
      disciplines: [{ title: 'Algorithms' }, { title: 'Distributed Systems' }],
    },
    {
      title: 'Social Systems',
      description: 'Collective human behavior and institutions.',
      disciplines: [{ title: 'Economics' }, { title: 'Political Theory' }],
    },
    {
      title: 'Philosophy of Mind',
      description: 'Nature of consciousness and cognition.',
      disciplines: [{ title: 'Cognition Studies' }, { title: 'Philosophy of Perception' }],
    },
  ];

  const booksCreated = await prisma.$transaction(
    books.map((book) =>
      prisma.book.create({
        data: {
          title: book.title,
          description: book.description ?? null,
          disciplines: {
            create: book.disciplines.map((discipline) => ({
              title: discipline.title,
              description: discipline.description ?? null,
            })),
          },
        },
        include: { disciplines: true },
      })
    )
  );

  const disciplineMap = new Map();
  for (const entry of booksCreated) {
    for (const discipline of entry.disciplines) {
      disciplineMap.set(`${entry.title}:${discipline.title}`, discipline.id);
    }
  }

  const usersSeed = [
    {
      key: 'root',
      name: 'Root Admin',
      email: 'root@euclid.network',
      handle: 'root',
      display: 'Root Admin',
      displayHandle: 'root',
      tier: Tier.TIER1,
      role: UserRole.ADMIN,
      bio: 'System administrator for Euclid Network. Use credentials passcode to switch roles during QA.',
      website: 'https://euclid.network',
      location: 'Alexandria, Virtual Node',
      expertise: ['infrastructure', 'governance'],
      verifiedAt: new Date().toISOString(),
      verifiedDomains: ['euclid.network'],
      verifiedDocs: 5,
    },
    {
      key: 'aristotle',
      name: 'Aristotle',
      email: 'aristotle@history.euclid',
      handle: 'aristotle.euklid',
      display: 'Aristotle',
      displayHandle: 'aristotle',
      tier: Tier.TIER1,
      role: UserRole.MEMBER,
      isHistorical: true,
      legacySource: 'Classical Corpus',
      legacyWorksCount: 128,
      bio: 'Philosopher of logic and natural sciences. Curated works imported from the Lyceum archives.',
      location: 'Athens, Greece (Historical)',
      expertise: ['logic', 'natural philosophy'],
      verifiedAt: new Date('2020-01-15T12:00:00Z').toISOString(),
      verifiedByKey: 'root',
    },
    {
      key: 'archimedes',
      name: 'Archimedes',
      email: 'archimedes@history.euclid',
      handle: 'archimedes.euklid',
      display: 'Archimedes',
      displayHandle: 'archimedes',
      tier: Tier.TIER1,
      role: UserRole.MEMBER,
      isHistorical: true,
      legacySource: 'Classical Corpus',
      legacyWorksCount: 94,
      bio: 'Mathematician, physicist, engineer. Historical profile focusing on mechanics and infinitesimals.',
      location: 'Syracuse, Sicily (Historical)',
      expertise: ['geometry', 'hydrostatics'],
      verifiedAt: new Date('2020-01-20T12:00:00Z').toISOString(),
      verifiedByKey: 'root',
    },
    {
      key: 'newton',
      name: 'Isaac Newton',
      email: 'newton@history.euclid',
      handle: 'newton.euklid',
      display: 'Isaac Newton',
      displayHandle: 'isaac-newton',
      tier: Tier.TIER1,
      role: UserRole.MEMBER,
      isHistorical: true,
      legacySource: 'Royal Society Ledger',
      legacyWorksCount: 76,
      bio: 'Author of the Principia, curator of gravitational proofs and series expansions.',
      location: 'Cambridge, England (Historical)',
      expertise: ['calculus', 'classical mechanics'],
      verifiedAt: new Date('2020-01-22T12:00:00Z').toISOString(),
      verifiedByKey: 'root',
    },
    {
      key: 'alice',
      name: 'Alice Euclid',
      email: 'alice@euclid.network',
      handle: 'alice.euklid',
      display: 'Alice Euclid',
      displayHandle: 'alice',
      tier: Tier.TIER1,
      role: UserRole.ADMIN,
      bio: 'Founding researcher curating probabilistic proof trails.',
      website: 'https://proofs.euclid.network/alice',
      location: 'Lisbon, Portugal',
      expertise: ['number theory', 'probabilistic proofs'],
      verifiedAt: new Date('2023-03-10T15:00:00Z').toISOString(),
      verifiedByKey: 'root',
      verifiedDomains: ['euclid.network'],
      verifiedDocs: 2,
    },
    {
      key: 'bob',
      name: 'Bob Archimedes',
      email: 'bob@euclid.network',
      handle: 'bob.euklid',
      display: 'Bob Archimedes',
      displayHandle: 'bob-a',
      tier: Tier.TIER2,
      role: UserRole.MODERATOR,
      bio: 'Moderator focused on geometric consistency and replication requests.',
      location: 'Boston, USA',
      expertise: ['geometry', 'peer review'],
      verifiedDomains: ['mit.edu'],
    },
    {
      key: 'carol',
      name: 'Carol Gauss',
      email: 'carol@euclid.network',
      handle: 'carol.euklid',
      display: 'Carol Gauss',
      displayHandle: 'c-gauss',
      tier: Tier.TIER3,
      role: UserRole.MEMBER,
      bio: 'Replication lead exploring number theoretic conjectures.',
      location: 'Berlin, Germany',
      expertise: ['number theory', 'replication studies'],
    },
    {
      key: 'dave',
      name: 'Dave Fields',
      email: 'dave@euclid.network',
      handle: 'dave.euklid',
      display: 'Dave Fields',
      displayHandle: 'dave-f',
      tier: Tier.TIER4,
      role: UserRole.MEMBER,
      bio: 'Data scientist experimenting with large probabilistic datasets.',
      location: 'Toronto, Canada',
      expertise: ['data science', 'probability'],
    },
  ];

  const users = new Map();
  for (const seed of usersSeed) {
    const verifiedBy = seed.verifiedByKey ? users.get(seed.verifiedByKey) : null;
    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        handle: seed.handle,
        display: seed.display,
        displayHandle: seed.displayHandle ?? seed.handle ?? null,
        tier: seed.tier,
        role: seed.role,
        bio: seed.bio ?? null,
        website: seed.website ?? null,
        location: seed.location ?? null,
        expertise: seed.expertise ?? [],
        verifiedDomains: seed.verifiedDomains ?? [],
        verifiedDocs: seed.verifiedDocs ?? 0,
        isHistorical: seed.isHistorical ?? false,
        legacySource: seed.legacySource ?? null,
        legacyWorksCount: seed.legacyWorksCount ?? 0,
        verifiedAt: seed.verifiedAt ? new Date(seed.verifiedAt) : null,
        verifiedById: verifiedBy?.id ?? null,
        lastLoginAt: seed.lastLoginAt
          ? new Date(seed.lastLoginAt)
          : seed.verifiedAt
            ? new Date(seed.verifiedAt)
            : new Date(),
      },
    });
    users.set(seed.key, user);
  }

  const institutions = await prisma.$transaction([
    prisma.institution.create({
      data: {
        name: 'Harvard University',
        domain: 'harvard.edu',
        kind: 'university',
        reputation: 92,
      },
    }),
    prisma.institution.create({
      data: {
        name: 'Massachusetts Institute of Technology',
        domain: 'mit.edu',
        kind: 'university',
        reputation: 95,
      },
    }),
    prisma.institution.create({
      data: { name: 'Max Planck Society', domain: 'mpg.de', kind: 'research', reputation: 90 },
    }),
    prisma.institution.create({
      data: {
        name: 'National Bureau of Economic Research',
        domain: 'nber.org',
        kind: 'think_tank',
        reputation: 88,
      },
    }),
    prisma.institution.create({
      data: { name: 'World Bank', domain: 'worldbank.org', kind: 'ngo', reputation: 86 },
    }),
  ]);

  const mit = institutions[1];
  const harvard = institutions[0];

  const alice = getRequired(users, 'alice');
  const bob = getRequired(users, 'bob');
  const carol = getRequired(users, 'carol');
  const dave = getRequired(users, 'dave');
  const aristotle = getRequired(users, 'aristotle');
  const archimedes = getRequired(users, 'archimedes');
  const newton = getRequired(users, 'newton');

  await prisma.userInstitution.create({
    data: {
      userId: alice.id,
      institutionId: harvard.id,
      role: 'Administrator',
      verified: true,
      proofUri: 'https://www.harvard.edu/directories/',
    },
  });

  await prisma.userInstitution.create({
    data: {
      userId: bob.id,
      institutionId: mit.id,
      role: 'Postdoctoral Fellow',
      verified: true,
      proofUri: 'https://www.mit.edu/people/',
    },
  });

  await prisma.verificationSubmission.create({
    data: {
      userId: dave.id,
      type: VerificationType.DOCUMENT_ORG,
      status: VerificationStatus.PENDING,
      payload: {
        institutionName: 'Cambridge Research Collective',
        role: 'Associate Researcher',
        proofUrl: 'https://example.org/cambridge-research-collective',
      },
    },
  });

  await prisma.endorsement.create({
    data: {
      endorserId: alice.id,
      endorseedId: carol.id,
      weight: 4,
      note: 'Has led several successful replication studies in number theory.',
    },
  });

  const geometryId = disciplineMap.get('Mathematics:Geometry');
  const numberTheoryId = disciplineMap.get('Mathematics:Number Theory');
  if (!geometryId || !numberTheoryId) {
    throw new Error('Required disciplines were not created.');
  }

  const parallelLines = await prisma.node.create({
    data: {
      title: 'Parallel Lines',
      statement: 'Two lines in a plane that do not meet; they remain at a constant distance.',
      type: NodeType.DEFINITION,
      status: NodeStatus.PROVEN,
      metadata: { source: 'Elements, Book I' },
      createdById: aristotle.id,
      disciplineId: geometryId,
    },
  });

  const parallelPostulate = await prisma.node.create({
    data: {
      title: "Euclid's Parallel Postulate",
      statement:
        'Given a line and a point not on that line, there exists exactly one line through the point that is parallel to the given line.',
      type: NodeType.AXIOM,
      status: NodeStatus.PROVEN,
      createdById: archimedes.id,
      disciplineId: geometryId,
    },
  });

  const triangleAngles = await prisma.node.create({
    data: {
      title: 'Sum of interior angles in a triangle',
      statement:
        'The sum of the interior angles of a triangle equals two right angles (180 degrees).',
      type: NodeType.THEOREM,
      status: NodeStatus.PROVEN,
      createdById: newton.id,
      disciplineId: geometryId,
    },
  });

  const probabilisticPrimality = await prisma.node.create({
    data: {
      title: 'Probabilistic primality for large numbers',
      statement:
        'Certain probabilistic tests suggest the primality of large numbers with high confidence. This node collects evidence for numbers of the form 2^p - 1.',
      type: NodeType.OBSERVATION,
      status: NodeStatus.PROBABILISTIC,
      metadata: { algorithm: 'Miller-Rabin', iterations: 25 },
      createdById: alice.id,
      disciplineId: numberTheoryId,
    },
  });

  await prisma.edge.createMany({
    data: [
      { fromId: parallelPostulate.id, toId: parallelLines.id, kind: 'DEPENDS_ON', weight: 1 },
      { fromId: triangleAngles.id, toId: parallelPostulate.id, kind: 'PROVES', weight: 1 },
      { fromId: triangleAngles.id, toId: parallelLines.id, kind: 'DEPENDS_ON', weight: 0.8 },
    ],
  });

  const anchor = Date.now();
  const minutesAgo = (minutes) => new Date(anchor - minutes * 60 * 1000);

  const [triangleProofEvidence, mersenneDataset] = await prisma.$transaction([
    prisma.evidence.create({
      data: {
        nodeId: triangleAngles.id,
        kind: EvidenceKind.FORMAL_PROOF,
        uri: 'https://mathworld.wolfram.com/Triangle.html',
        summary: 'Classical Euclidean proof linking exterior angles to interior sums.',
        addedById: alice.id,
        createdAt: minutesAgo(90),
      },
    }),
    prisma.evidence.create({
      data: {
        nodeId: probabilisticPrimality.id,
        kind: EvidenceKind.DATASET,
        uri: 'https://example.com/data/mersenne-primes.csv',
        summary: 'Dataset of probabilistic primality confirmations for Mersenne numbers.',
        confidence: 0.92,
        addedById: bob.id,
        createdAt: minutesAgo(60),
      },
    }),
  ]);

  const geometryDiscussion = await prisma.discussion.create({
    data: {
      nodeId: triangleAngles.id,
      authorId: bob.id,
      content: 'Can we generalize this result to non-Euclidean geometries within Euclid?',
      createdAt: minutesAgo(55),
    },
  });

  await prisma.reply.create({
    data: {
      discussionId: geometryDiscussion.id,
      authorId: carol.id,
      content: 'We might examine spherical geometries and note how the sum exceeds 180 degrees.',
      createdAt: minutesAgo(45),
    },
  });

  await prisma.vote.create({
    data: {
      discussionId: geometryDiscussion.id,
      userId: alice.id,
      type: VoteType.AGREE,
      weight: 2,
      createdAt: minutesAgo(40),
    },
  });

  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followeeUserId: bob.id, createdAt: minutesAgo(180) },
      { followerId: carol.id, followeeUserId: alice.id, createdAt: minutesAgo(170) },
      { followerId: dave.id, followeeUserId: alice.id, createdAt: minutesAgo(165) },
      { followerId: bob.id, followDisciplineId: geometryId, createdAt: minutesAgo(160) },
      { followerId: carol.id, followDisciplineId: numberTheoryId, createdAt: minutesAgo(155) },
    ],
    skipDuplicates: true,
  });

  await prisma.activity.createMany({
    data: [
      {
        actorId: alice.id,
        action: ActivityAction.CREATE_NODE,
        targetNodeId: triangleAngles.id,
        targetDisciplineId: geometryId,
        weight: 8,
        createdAt: minutesAgo(120),
      },
      {
        actorId: bob.id,
        action: ActivityAction.CREATE_DISCUSSION,
        targetNodeId: triangleAngles.id,
        targetDiscussionId: geometryDiscussion.id,
        targetDisciplineId: geometryId,
        weight: 5,
        createdAt: minutesAgo(52),
      },
      {
        actorId: carol.id,
        action: ActivityAction.REPLY,
        targetDiscussionId: geometryDiscussion.id,
        targetNodeId: triangleAngles.id,
        weight: 4,
        createdAt: minutesAgo(44),
      },
      {
        actorId: alice.id,
        action: ActivityAction.ADD_EVIDENCE,
        targetEvidenceId: triangleProofEvidence.id,
        targetNodeId: triangleAngles.id,
        weight: 6,
        createdAt: minutesAgo(38),
      },
      {
        actorId: alice.id,
        action: ActivityAction.VOTE,
        targetDiscussionId: geometryDiscussion.id,
        targetNodeId: triangleAngles.id,
        weight: 2,
        createdAt: minutesAgo(37),
      },
      {
        actorId: bob.id,
        action: ActivityAction.ADD_EVIDENCE,
        targetEvidenceId: mersenneDataset.id,
        targetNodeId: probabilisticPrimality.id,
        targetDisciplineId: numberTheoryId,
        weight: 5,
        createdAt: minutesAgo(28),
      },
      {
        actorId: dave.id,
        action: ActivityAction.REPLICATE,
        targetNodeId: probabilisticPrimality.id,
        targetDisciplineId: numberTheoryId,
        weight: 3,
        createdAt: minutesAgo(24),
      },
      {
        actorId: carol.id,
        action: ActivityAction.FOLLOW,
        targetUserId: alice.id,
        weight: 1,
        createdAt: minutesAgo(150),
      },
      {
        actorId: bob.id,
        action: ActivityAction.FOLLOW,
        targetDisciplineId: geometryId,
        weight: 1,
        createdAt: minutesAgo(148),
      },
    ],
  });

  const now = new Date();
  const addDays = (base, days) => {
    const copy = new Date(base);
    copy.setDate(copy.getDate() + days);
    return copy;
  };

  await prisma.flag.create({
    data: {
      reporterId: carol.id,
      targetType: 'DISCUSSION',
      targetId: geometryDiscussion.id,
      reason: 'Needs clearer citations for non-Euclidean cases.',
    },
  });

  await prisma.flag.create({
    data: {
      reporterId: dave.id,
      targetType: 'NODE',
      targetId: probabilisticPrimality.id,
      reason: 'Confidence claims need supporting datasets.',
      status: 'REVIEWED',
      reviewedById: alice.id,
      reviewedAt: now,
      decisionNote: 'Warned author to attach replication details.',
    },
  });

  await prisma.moderationEvent.create({
    data: {
      actorId: alice.id,
      targetUserId: bob.id,
      targetType: 'USER',
      targetId: bob.id,
      action: 'WARN',
      reason: 'Moderator reminder to cite authoritative sources in reviews.',
      note: 'Initial advisory notice',
      weight: 1,
      expiresAt: addDays(now, 14),
    },
  });

  await prisma.moderationEvent.create({
    data: {
      actorId: alice.id,
      targetUserId: dave.id,
      targetType: 'USER',
      targetId: dave.id,
      action: 'BAN',
      reason: 'Repeated submission of unverified datasets.',
      note: 'Temporary suspension enforced during beta.',
      weight: 2,
      expiresAt: addDays(now, 7),
    },
  });

  await prisma.user.update({
    where: { id: bob.id },
    data: {
      warningsCount: { increment: 1 },
      lastActionAt: now,
    },
  });

  await prisma.user.update({
    where: { id: dave.id },
    data: {
      isBanned: true,
      bannedUntil: addDays(now, 7),
      bansCount: { increment: 1 },
      lastActionAt: now,
    },
  });

  await refreshUserStats();

  await prisma.adminSetting.createMany({
    data: [
      {
        key: 'rate_limits',
        value: {
          postNodeLimit: 30,
          postDiscussionLimit: 60,
          postCommentLimit: 100,
        },
      },
      {
        key: 'verification_requirements',
        value: {
          autoTierUpgradeDocs: 3,
          minReplicationScore: 12,
        },
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: alice.id,
        action: 'ADMIN_SETTINGS_UPDATE',
        targetType: 'SETTING',
        targetId: 'rate_limits',
        meta: { postNodeLimit: 30 },
      },
      {
        actorId: alice.id,
        action: 'ADMIN_USER_UPDATE',
        targetType: 'USER',
        targetId: bob.id,
        meta: { tier: 'TIER2', role: 'MODERATOR' },
      },
      {
        actorId: alice.id,
        action: 'ADMIN_USER_UPDATE',
        targetType: 'USER',
        targetId: dave.id,
        meta: { ban: true, expiresIn: 7 },
      },
    ],
  });

  console.log('✅ Seed complete');
}

async function run() {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
