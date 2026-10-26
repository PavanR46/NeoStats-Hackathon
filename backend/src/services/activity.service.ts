import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { GetActivitiesQuery } from '../schemas/activity.schema';

export interface RecordActivityInput {
  userId?: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export async function recordActivity(
  input: RecordActivityInput,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  return db.activityLog.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function getActivities(
  currentUser: { id: string; globalRole: string } | undefined,
  projectId: string | undefined,
  query: GetActivitiesQuery
) {
  const { page = 1, limit = 20, action, entityType } = query;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (projectId) {
    where.projectId = projectId;
  } else if (currentUser && currentUser.globalRole !== 'ADMIN') {
    const userMemberships = await prisma.projectMember.findMany({
      where: { userId: currentUser.id },
      select: { projectId: true },
    });
    const userProjectIds = userMemberships.map((m) => m.projectId);
    where.OR = [
      { projectId: { in: userProjectIds } },
      { userId: currentUser.id },
    ];
  }

  if (action) {
    where.action = action;
  }
  if (entityType) {
    where.entityType = entityType;
  }

  const [total, activities] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    data: activities,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
