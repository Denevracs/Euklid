import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import type {
  NodeCreateInput,
  NodeUpdateInput,
  EvidenceCreateInput,
  EdgeCreateInput,
} from '@euclid/validation';

type InlineEvidenceInput = Omit<EvidenceCreateInput, 'nodeId'>;

export const nodeDetailInclude = {
  createdBy: true,
  evidence: {
    orderBy: { createdAt: 'desc' },
  },
  outgoingEdges: {
    include: {
      to: true,
    },
  },
  incomingEdges: {
    include: {
      from: true,
    },
  },
  activity: {
    orderBy: { createdAt: 'desc' },
    include: { actor: true },
  },
} satisfies Prisma.NodeInclude;

export type NodeWithRelations = Prisma.NodeGetPayload<{
  include: typeof nodeDetailInclude;
}>;

export async function listRecentNodes(limit = 10) {
  return prisma.node.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: nodeDetailInclude,
  });
}

export async function listAllNodes() {
  return prisma.node.findMany({
    orderBy: { title: 'asc' },
    select: {
      id: true,
      title: true,
      type: true,
    },
  });
}

export async function searchNodes(query: string) {
  return prisma.node.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { statement: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    include: nodeDetailInclude,
  });
}

export async function getNodeDetail(id: string) {
  return prisma.node.findUnique({
    where: { id },
    include: nodeDetailInclude,
  });
}

export async function createNode(
  input: NodeCreateInput & { evidence?: InlineEvidenceInput[]; edges?: EdgeCreateInput[] },
  userId: string
) {
  return prisma.node.create({
    data: {
      title: input.title,
      statement: input.statement,
      type: input.type,
      status: input.status,
      metadata: input.metadata ?? undefined,
      createdBy: {
        connect: { id: userId },
      },
      evidence: input.evidence
        ? {
            create: input.evidence.map((item) => ({
              ...item,
              addedBy: { connect: { id: userId } },
            })),
          }
        : undefined,
      outgoingEdges: input.dependencies?.length
        ? {
            create: input.dependencies.map((dependencyId) => ({
              toId: dependencyId,
              kind: 'DEPENDS_ON' as const,
              weight: 1,
            })),
          }
        : undefined,
    },
    include: nodeDetailInclude,
  });
}

export async function updateNode(id: string, input: NodeUpdateInput) {
  const { title, statement, status, type, metadata } = input;
  return prisma.node.update({
    where: { id },
    data: {
      title,
      statement,
      status,
      type,
      metadata: metadata ?? undefined,
    },
    include: nodeDetailInclude,
  });
}

export async function deleteNode(id: string) {
  return prisma.node.delete({
    where: { id },
  });
}

export async function createEdge(input: EdgeCreateInput) {
  return prisma.edge.create({
    data: input,
    include: {
      from: true,
      to: true,
    },
  });
}

export async function createEvidence(input: EvidenceCreateInput, addedBy: string) {
  return prisma.evidence.create({
    data: {
      kind: input.kind,
      uri: input.uri,
      summary: input.summary,
      hash: input.hash,
      confidence: input.confidence,
      node: { connect: { id: input.nodeId } },
      addedBy: { connect: { id: addedBy } },
    },
    include: {
      node: true,
      addedBy: true,
    },
  });
}

export async function getGraphNeighborhood(nodeId: string, depth = 1) {
  return prisma.node.findUnique({
    where: { id: nodeId },
    include: {
      outgoingEdges: {
        include: {
          to: {
            include: {
              outgoingEdges: depth > 1,
              incomingEdges: depth > 1,
            },
          },
        },
      },
      incomingEdges: {
        include: {
          from: {
            include: {
              outgoingEdges: depth > 1,
              incomingEdges: depth > 1,
            },
          },
        },
      },
    },
  });
}
