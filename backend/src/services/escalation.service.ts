import { EscalationType, GlobalRole, Prisma, ProjectRole, TaskStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError, ConflictError } from '../middlewares/error.middleware';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { getSlaPolicy, isFinished, MINUTE } from './task.service';
import { broadcastToProject, sendToUser } from '../socket';
import { GetEscalationsQuery } from '../schemas/escalation.schema';

type Db = Prisma.TransactionClient;

export const MAX_ESCALATION_LEVEL = 3; // 1 = agent, 2 = project manager, 3 = admin

// Level 2 -> a project manager of the team (not the current owner). Otherwise, and for level 3 -> an admin.
async function findEscalationTarget(db: Db, projectId: string, toLevel: number, excludeUserId: string | null) {
  if (toLevel === 2) {
    const pm = await db.projectMember.findFirst({
      where: { 
        projectId,
        role: ProjectRole.PROJECT_MANAGER, 
        user: { 
          isActive: true, 
          globalRole: { not: GlobalRole.ADMIN } // Admins are level 3, not level 2!
        },
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    if (pm) return pm.userId;
  }
  
  const admin = await db.user.findFirst({
    where: { globalRole: GlobalRole.ADMIN, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return admin?.id ?? null;
}

export interface EscalateParams {
  taskId: string;
  type: EscalationType;
  reason: string;
  actorUserId?: string; // undefined = the system (SLA worker)
  expectedVersion: number;
}

export async function escalateTicket(p: EscalateParams) {
  const { updated, projectId, notifs } = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id: p.taskId },
      include: { project: { select: { name: true, isArchived: true } } },
    });
    if (!existing) {
      throw new AppError('Task not found.', 404);
    }
    if (existing.project.isArchived) {
      throw new AppError('This project is archived and read-only.', 403);
    }
    if (isFinished(existing.status)) {
      throw new AppError('Resolved or closed tickets cannot be escalated.', 400);
    }
    if (existing.escalationLevel >= MAX_ESCALATION_LEVEL) {
      throw new AppError('This ticket is already at the highest escalation level.', 400);
    }

    const fromLevel = existing.escalationLevel;
    const toLevel = fromLevel + 1;
    const targetId = await findEscalationTarget(tx, existing.projectId, toLevel, existing.assigneeId);

    // The next level gets a fresh, shorter window: half the original resolve time (min 15 min)
    const policy = await getSlaPolicy(tx, existing.projectId, existing.priority);
    const nextDue = policy
      ? new Date(Date.now() + Math.max(15, Math.round(policy.resolveMinutes / 2)) * MINUTE)
      : existing.slaResolveDueAt;

    // Same optimistic lock as normal edits: if someone changed the ticket meanwhile, nothing is written
    const result = await tx.task.updateMany({
      where: { id: existing.id, version: p.expectedVersion },
      data: {
        version: { increment: 1 },
        status: TaskStatus.ESCALATED,
        escalationLevel: toLevel,
        assigneeId: targetId ?? existing.assigneeId,
        slaResolveDueAt: nextDue,
        slaBreachedAt: null,
      },
    });

    if (result.count === 0) {
      const latestTask = await tx.task.findUnique({
        where: { id: existing.id },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          requester: { select: { id: true, name: true, email: true } },
        },
      });
      throw new ConflictError(
        'Task has been modified by another user since you loaded it. Please review the latest changes.',
        latestTask
      );
    }

    await tx.escalation.create({
      data: {
        taskId: existing.id,
        fromLevel,
        toLevel,
        type: p.type,
        reason: p.reason,
        escalatedById: p.actorUserId,
        escalatedToId: targetId,
        fromAssigneeId: existing.assigneeId,
      },
    });

    const updated = await tx.task.findUnique({
      where: { id: existing.id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    await recordActivity(
      {
        userId: p.actorUserId,
        projectId: existing.projectId,
        action: 'TASK_ESCALATED',
        entityType: 'Task',
        entityId: existing.id,
        metadata: {
          ticketNumber: updated!.ticketNumber,
          fromLevel,
          toLevel,
          type: p.type,
          reason: p.reason,
          escalatedToId: targetId,
          fromAssigneeId: existing.assigneeId,
        },
      },
      tx
    );

    const notifs: any[] = [];
    const link = `/projects/${existing.projectId}/tasks`;
    const ref = `#${updated!.ticketNumber} "${updated!.title}"`;

    if (targetId) {
      const n = await createNotification(
        {
          userId: targetId,
          actorUserId: p.actorUserId,
          type: 'TASK_ESCALATED',
          title: 'Ticket escalated to you',
          message: `Ticket ${ref} was escalated to level ${toLevel}: ${p.reason}`,
          link,
        },
        tx
      );
      if (n) notifs.push(n);
    }
    if (existing.assigneeId && existing.assigneeId !== targetId) {
      const n = await createNotification(
        {
          userId: existing.assigneeId,
          actorUserId: p.actorUserId,
          type: 'TASK_ESCALATED',
          title: 'Your ticket was escalated',
          message: `Ticket ${ref} moved to level ${toLevel}.`,
          link,
        },
        tx
      );
      if (n) notifs.push(n);
    }

    return { updated: updated!, projectId: existing.projectId, notifs };
  });

  // Announce only after the transaction has committed
  broadcastToProject(projectId, 'task:updated', updated);
  notifs.forEach((n) => sendToUser(n.userId, 'notification:new', n));

  return updated;
}

export async function getTaskEscalations(taskId: string) {
  return prisma.escalation.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      escalatedBy: { select: { id: true, name: true } },
      escalatedTo: { select: { id: true, name: true } },
      fromAssignee: { select: { id: true, name: true } },
    },
  });
}

export async function listEscalations(
  user: { id: string; globalRole: string },
  query: GetEscalationsQuery
) {
  const { page, limit, projectId, type } = query;
  const where: Prisma.EscalationWhereInput = {};
  if (type) where.type = type;

  if (user.globalRole !== 'ADMIN') {
    // PMs see their teams' escalations; everyone else only ones that involve them.
    // This restriction always applies, even when a projectId filter is supplied.
    where.OR = [
      { task: { project: { members: { some: { userId: user.id, role: ProjectRole.PROJECT_MANAGER } } } } },
      { fromAssigneeId: user.id },
      { escalatedToId: user.id },
    ];
  }
  if (projectId) where.task = { projectId };

  const [total, rows] = await Promise.all([
    prisma.escalation.count({ where }),
    prisma.escalation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            escalationLevel: true,
            projectId: true,
            project: { select: { name: true } },
          },
        },
        escalatedBy: { select: { id: true, name: true } },
        escalatedTo: { select: { id: true, name: true } },
        fromAssignee: { select: { id: true, name: true } },
      },
    }),
  ]);

  return { data: rows, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}