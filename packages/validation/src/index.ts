import { z } from 'zod';

export const nodeTypeEnum = z.enum([
  'DEFINITION',
  'AXIOM',
  'THEOREM',
  'OBSERVATION',
  'COUNTEREXAMPLE',
  'APPLICATION',
]);

export const nodeStatusEnum = z.enum([
  'HYPOTHETICAL',
  'UNDER_REVIEW',
  'PROVEN',
  'DISPROVEN',
  'REVISED',
  'PROBABILISTIC',
]);

export const edgeKindEnum = z.enum([
  'DEPENDS_ON',
  'PROVES',
  'DISPROVES',
  'EXTENDS',
  'ANALOGOUS_TO',
]);

export const evidenceKindEnum = z.enum(['FORMAL_PROOF', 'REPLICATION', 'CITATION', 'DATASET']);

export const nodeCreateSchema = z
  .object({
    title: z.string().min(3),
    statement: z.string().min(10),
    type: nodeTypeEnum,
    status: nodeStatusEnum,
    metadata: z.record(z.any()).default({}).optional(),
    dependencies: z.array(z.string()).default([]),
    evidence: z
      .array(
        z.object({
          kind: evidenceKindEnum,
          uri: z.string().url(),
          summary: z.string().min(5),
          hash: z.string().min(5).optional(),
          confidence: z.number().min(0).max(1).optional(),
        })
      )
      .optional(),
  })
  .strict();

export const nodeUpdateSchema = nodeCreateSchema.partial().extend({
  id: z.string().uuid().optional(),
});

export const edgeCreateSchema = z
  .object({
    fromId: z.string().uuid(),
    toId: z.string().uuid(),
    kind: edgeKindEnum,
    weight: z.number().min(0).max(1).default(1),
  })
  .strict();

export const evidenceCreateSchema = z
  .object({
    nodeId: z.string().uuid(),
    kind: evidenceKindEnum,
    uri: z.string().url(),
    summary: z.string().min(5),
    hash: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export type NodeCreateInput = z.infer<typeof nodeCreateSchema>;
export type NodeUpdateInput = z.infer<typeof nodeUpdateSchema>;
export type EdgeCreateInput = z.infer<typeof edgeCreateSchema>;
export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;
