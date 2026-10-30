import { Prisma, ProjectRole, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { AppError, ConflictError } from '../middlewares/error.middleware';
import { broadcastToProject, sendToUser } from '../socket';

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string | null;
  requesterId?: string | null;
  category?: string;
  dueDate?: string | Date | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  category?: string | null;
  dueDate?: string | Date | null;
  version: number;
}

export interface UpdateTaskStatusInput {
  status: TaskStatus;
  version: number;
}

export interface GetTasksQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const MINUTE = 60_000;
type Db = Prisma.TransactionClient;

// Team-specific SLA policy first, then the global default (projectId = null)
export async function getSlaPolicy(db: Db, projectId: string, priority: TaskPriority) {
  const specific = await db.slaPolicy.findFirst({ where: { projectId, priority } });
  if (specific) return specific;
  return db.slaPolicy.findFirst({ where: { projectId: null, priority } });
}

function slaDatesFrom(start: Date, policy: { responseMinutes: number; resolveMinutes: number } | null) {
  return {
    slaResponseDueAt: policy ? new Date(start.getTime() + policy.responseMinutes * MINUTE) : null,
    slaResolveDueAt: policy ? new Date(start.getTime() + policy.resolveMinutes * MINUTE) : null,
  };
}

async function assertAssignable(db: Db, projectId: string, userId: string) {
  const member = await db.projectMember.findFirst({
    where: { projectId, userId, role: { not: ProjectRole.VIEWER }, user: { isActive: true } },
  });
  if (!member) {
    throw new AppError('Assignee must be an active, non-viewer member of this project.', 400);
  }
}

export const isFinished = (s: TaskStatus) => s === TaskStatus.DONE || s === TaskStatus.CLOSED;

export async function createTask(creatorId: string, projectId: string, input: CreateTaskInput) {
  const { task, notifs } = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('Project not found.', 404);
    }
    if (project.isArchived) {
      throw new AppError('This project is archived and read-only.', 403);
    }
    const status = input.status ?? TaskStatus.TODO;
    if (isFinished(status) || input.status === TaskStatus.ESCALATED) {
      throw new AppError('A new ticket must start as TODO, IN_PROGRESS or IN_REVIEW.', 400);
    }
    if (input.assigneeId) {
      await assertAssignable(tx, projectId, input.assigneeId);
    }
    if (input.requesterId) {
      const requester = await tx.user.findUnique({ where: { id: input.requesterId } });
      if (!requester || !requester.isActive) {
        throw new AppError('Requester not found or deactivated.', 400);
      }
    }

    const now = new Date();
    const priority = input.priority ?? TaskPriority.MEDIUM;
    const policy = await getSlaPolicy(tx, projectId, priority);

    const createdTask = await tx.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        status,
        priority,
        version: 1,
        createdById: creatorId,
        requesterId: input.requesterId ?? creatorId,
        category: input.category,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
        createdAt: now,
        ...slaDatesFrom(now, policy),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    await recordActivity(
      {
        userId: creatorId,
        projectId,
        action: 'TASK_CREATED',
        entityType: 'Task',
        entityId: createdTask.id,
        metadata: {
          title: createdTask.title,
          ticketNumber: createdTask.ticketNumber,
          status: createdTask.status,
          priority: createdTask.priority,
        },
      },
      tx
    );

    const notifs: any[] = [];
    if (input.assigneeId) {
      const notif = await createNotification(
        {
          userId: input.assigneeId,
          actorUserId: creatorId,
          type: 'TASK_ASSIGNED',
          title: 'New Ticket Assigned',
          message: `You were assigned ticket #${createdTask.ticketNumber} "${createdTask.title}" in "${project.name}"`,
          link: `/projects/${projectId}/tasks`,
        },
        tx
      );
      if (notif) notifs.push(notif);
    }

    return { task: createdTask, notifs };
  });

  broadcastToProject(projectId, 'task:created', task);
  notifs.forEach((n) => sendToUser(n.userId, 'notification:new', n));

  return task;
}

export async function getTasks(projectId: string, query: GetTasksQuery) {
  const { page = 1, limit = 10, search, status, priority, assigneeId } = query;
  const skip = (page - 1) * limit;

  const where: any = { projectId };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  return {
    data: tasks,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTaskById(taskId: string, includeInternal: boolean) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
      comments: {
        where: includeInternal ? undefined : { isInternal: false },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found.', 404);
  }

  return task;
}

export async function updateTask(
  actorUserId: string,
  taskId: string,
  input: UpdateTaskInput,
  actorIsLead: boolean = false
) {
  const { updatedTask, projectId, notifs } = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { name: true, isArchived: true } } },
    });
    if (!existing) {
      throw new AppError('Task not found.', 404);
    }
    if (existing.project.isArchived) {
      throw new AppError('This project is archived and read-only.', 403);
    }

    const nextStatus = input.status ?? existing.status;
    const statusChanging = input.status !== undefined && input.status !== existing.status;
    const assigneeChanging = input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId;
    const priorityChanging = input.priority !== undefined && input.priority !== existing.priority;

    // ---- Business rules ----
    if (statusChanging && nextStatus === TaskStatus.ESCALATED) {
      throw new AppError('Use the escalation endpoint to escalate a ticket.', 400);
    }
    if (statusChanging && nextStatus === TaskStatus.CLOSED && !actorIsLead) {
      throw new AppError('Only a Project Manager can close tickets.', 403);
    }
    if (statusChanging && existing.status === TaskStatus.CLOSED && !actorIsLead) {
      throw new AppError('Only a Project Manager can reopen a closed ticket.', 403);
    }
    if (assigneeChanging && !actorIsLead) {
      throw new AppError('Only a Project Manager can assign or reassign tickets.', 403);
    }
    if (priorityChanging && !actorIsLead) {
      throw new AppError('Only a Project Manager can change ticket priority (it controls the SLA).', 403);
    }
    if (assigneeChanging && input.assigneeId) {
      await assertAssignable(tx, existing.projectId, input.assigneeId);
    }

    // ---- Build the update ----
    const now = new Date();
    const dataToUpdate: any = { version: { increment: 1 } };

    if (input.title !== undefined) dataToUpdate.title = input.title;
    if (input.description !== undefined) dataToUpdate.description = input.description;
    if (input.status !== undefined) dataToUpdate.status = input.status;
    if (input.priority !== undefined) dataToUpdate.priority = input.priority;
    if (input.assigneeId !== undefined) dataToUpdate.assigneeId = input.assigneeId;
    if (input.dueDate !== undefined) dataToUpdate.dueDate = input.dueDate;
    if (input.category !== undefined) dataToUpdate.category = input.category;

    // ---- Lifecycle timestamps ----
    const reopening = statusChanging && isFinished(existing.status) && !isFinished(nextStatus);

    if (statusChanging && nextStatus === TaskStatus.DONE) {
      dataToUpdate.resolvedAt = now;
      dataToUpdate.closedAt = null;
    } else if (statusChanging && nextStatus === TaskStatus.CLOSED) {
      dataToUpdate.closedAt = now;
      if (!existing.resolvedAt) dataToUpdate.resolvedAt = now;
    } else if (reopening) {
      const policy = await getSlaPolicy(tx, existing.projectId, input.priority ?? existing.priority);
      dataToUpdate.reopenCount = { increment: 1 };
      dataToUpdate.resolvedAt = null;
      dataToUpdate.closedAt = null;
      dataToUpdate.slaBreachedAt = null;
      dataToUpdate.slaResolveDueAt = policy ? new Date(now.getTime() + policy.resolveMinutes * MINUTE) : null;
    }

    if (priorityChanging && !isFinished(existing.status)) {
      const policy = await getSlaPolicy(tx, existing.projectId, input.priority!);
      Object.assign(dataToUpdate, slaDatesFrom(existing.createdAt, policy));
    }

    const result = await tx.task.updateMany({
      where: { id: taskId, version: input.version },
      data: dataToUpdate,
    });

    if (result.count === 0) {
      const latestTask = await tx.task.findUnique({
        where: { id: taskId },
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

    const updated = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    await recordActivity(
      {
        userId: actorUserId,
        projectId: existing.projectId,
        action: 'TASK_UPDATED',
        entityType: 'Task',
        entityId: taskId,
        metadata: {
          previousVersion: input.version,
          newVersion: updated!.version,
          ticketNumber: updated!.ticketNumber,
          changes: input,
          ...(statusChanging ? { statusFrom: existing.status, statusTo: nextStatus } : {}),
          ...(reopening ? { reopened: true } : {}),
        },
      },
      tx
    );

    const notifs: any[] = [];
    const link = `/projects/${existing.projectId}/tasks`;
    const ref = `#${updated!.ticketNumber} "${updated!.title}"`;

    if (assigneeChanging && input.assigneeId) {
      const n = await createNotification(
        {
          userId: input.assigneeId,
          actorUserId,
          type: 'TASK_ASSIGNED',
          title: 'Ticket Assigned to You',
          message: `You were assigned ticket ${ref} in "${existing.project.name}"`,
          link,
        },
        tx
      );
      if (n) notifs.push(n);
    }

    if (statusChanging) {
      const recipients = new Set<string>();
      if (updated!.assigneeId) recipients.add(updated!.assigneeId);
      if (nextStatus === TaskStatus.DONE && updated!.requesterId) recipients.add(updated!.requesterId);
      if (assigneeChanging && input.assigneeId) recipients.delete(input.assigneeId);

      for (const userId of Array.from(recipients)) {
        const n = await createNotification(
          {
            userId,
            actorUserId,
            type: 'TASK_STATUS_CHANGED',
            title: 'Ticket Status Updated',
            message: `Ticket ${ref} status changed to ${updated!.status}`,
            link,
          },
          tx
        );
        if (n) notifs.push(n);
      }
    }

    return { updatedTask: updated!, projectId: existing.projectId, notifs };
  });

  broadcastToProject(projectId, 'task:updated', updatedTask);
  notifs.forEach((n) => sendToUser(n.userId, 'notification:new', n));

  return updatedTask;
}

export async function updateTaskStatus(
  actorUserId: string,
  taskId: string,
  input: UpdateTaskStatusInput,
  actorIsLead = false
) {
  return updateTask(actorUserId, taskId, { version: input.version, status: input.status }, actorIsLead);
}

export async function deleteTask(actorUserId: string, taskId: string) {
  const { projectId } = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new AppError('Task not found.', 404);
    }

    await tx.task.delete({ where: { id: taskId } });

    await recordActivity(
      {
        userId: actorUserId,
        projectId: task.projectId,
        action: 'TASK_DELETED',
        entityType: 'Task',
        entityId: taskId,
        metadata: { title: task.title },
      },
      tx
    );

    return { projectId: task.projectId };
  });

  broadcastToProject(projectId, 'task:deleted', { taskId, projectId });

  return { message: 'Task deleted successfully' };
}