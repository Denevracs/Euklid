import {
  ActivityAction,
  EvidenceKind,
  NodeStatus,
  NodeType,
  PrismaClient,
  ReputationTier,
} from '@prisma/client';

const prisma = new PrismaClient();

type DisciplineSeed = {
  title: string;
  description?: string;
};

type BookSeed = {
  title: string;
  description?: string;
  disciplines: DisciplineSeed[];
};

type UserSeed = {
  key: string;
  name: string;
  email: string;
  handle: string;
  display: string;
  tier: ReputationTier;
  role: 'MEMBER' | 'ADMIN';
  isHistorical?: boolean;
};

async function resetDatabase() {
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
  await prisma.user.deleteMany();
}

async function main() {
  console.log('🌱 Seeding Euclid Network phase 1 data...');

  await resetDatabase();

  const books: BookSeed[] = [
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

  const disciplineMap = new Map<string, string>();

  for (const bookSeed of books) {
    const book = await prisma.book.create({
      data: {
        title: bookSeed.title,
        description: bookSeed.description,
        disciplines: {
          create: bookSeed.disciplines.map((discipline) => ({
            title: discipline.title,
            description: discipline.description,
          })),
        },
      },
      include: { disciplines: true },
    });

    for (const discipline of book.disciplines) {
      disciplineMap.set(`${book.title}:${discipline.title}`, discipline.id);
    }
  }

  const usersSeed: UserSeed[] = [
    {
      key: 'aristotle',
      name: 'Aristotle',
      email: 'aristotle@history.euclid',
      handle: 'aristotle.euklid',
      display: 'Aristotle',
      tier: ReputationTier.TIER1,
      role: 'MEMBER',
      isHistorical: true,
    },
    {
      key: 'archimedes',
      name: 'Archimedes',
      email: 'archimedes@history.euclid',
      handle: 'archimedes.euklid',
      display: 'Archimedes',
      tier: ReputationTier.TIER1,
      role: 'MEMBER',
      isHistorical: true,
    },
    {
      key: 'newton',
      name: 'Isaac Newton',
      email: 'newton@history.euclid',
      handle: 'newton.euklid',
      display: 'Isaac Newton',
      tier: ReputationTier.TIER1,
      role: 'MEMBER',
      isHistorical: true,
    },
    {
      key: 'alice',
      name: 'Alice Euclid',
      email: 'alice@euclid.network',
      handle: 'alice.euklid',
      display: 'Alice Euclid',
      tier: ReputationTier.TIER1,
      role: 'ADMIN',
    },
    {
      key: 'bob',
      name: 'Bob Archimedes',
      email: 'bob@euclid.network',
      handle: 'bob.euklid',
      display: 'Bob Archimedes',
      tier: ReputationTier.TIER2,
      role: 'MEMBER',
    },
    {
      key: 'carol',
      name: 'Carol Gauss',
      email: 'carol@euclid.network',
      handle: 'carol.euklid',
      display: 'Carol Gauss',
      tier: ReputationTier.TIER3,
      role: 'MEMBER',
    },
    {
      key: 'dave',
      name: 'Dave Fields',
      email: 'dave@euclid.network',
      handle: 'dave.euklid',
      display: 'Dave Fields',
      tier: ReputationTier.TIER4,
      role: 'MEMBER',
    },
  ];

  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.create>>>();

  for (const seed of usersSeed) {
    const user = await prisma.user.create({
      data: {
        name: seed.name,
        email: seed.email,
        handle: seed.handle,
        display: seed.display,
        tier: seed.tier,
        role: seed.role,
        isHistorical: seed.isHistorical ?? false,
      },
    });
    users.set(seed.key, user);
  }

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
      createdById: users.get('aristotle')!.id,
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
      createdById: users.get('archimedes')!.id,
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
      createdById: users.get('newton')!.id,
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
      createdById: users.get('alice')!.id,
      disciplineId: numberTheoryId,
    },
  });

  await prisma.edge.createMany({
    data: [
      {
        fromId: parallelPostulate.id,
        toId: parallelLines.id,
        kind: 'DEPENDS_ON',
        weight: 1,
      },
      {
        fromId: triangleAngles.id,
        toId: parallelPostulate.id,
        kind: 'PROVES',
        weight: 1,
      },
      {
        fromId: triangleAngles.id,
        toId: parallelLines.id,
        kind: 'DEPENDS_ON',
        weight: 0.8,
      },
    ],
  });

  await prisma.evidence.createMany({
    data: [
      {
        nodeId: triangleAngles.id,
        kind: EvidenceKind.FORMAL_PROOF,
        uri: 'https://mathworld.wolfram.com/Triangle.html',
        summary: 'Classical Euclidean proof linking exterior angles to interior sums.',
        addedById: users.get('alice')!.id,
      },
      {
        nodeId: probabilisticPrimality.id,
        kind: EvidenceKind.DATASET,
        uri: 'https://example.com/data/mersenne-primes.csv',
        summary: 'Dataset of probabilistic primality confirmations for Mersenne numbers.',
        confidence: 0.92,
        addedById: users.get('bob')!.id,
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      {
        actorId: users.get('alice')!.id,
        targetNodeId: triangleAngles.id,
        action: ActivityAction.SUPPORT,
      },
      {
        actorId: users.get('bob')!.id,
        targetNodeId: probabilisticPrimality.id,
        action: ActivityAction.REPLICATE,
      },
    ],
  });

  console.log('✅ Phase 1 seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
