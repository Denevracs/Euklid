import type { ActivityAction } from '@prisma/client';
import { prisma } from './prisma';

export async function recordActivity(params: {
  actorId: string;
  action: ActivityAction;
  targetNodeId: string;
}) {
  return prisma.activity.create({
    data: params,
  });
}
