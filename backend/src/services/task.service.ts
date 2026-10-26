import { prisma } from '../db/prisma';
import { CreateTaskInput, UpdateTaskInput, GetTasksQuery, UpdateTaskStatusInput } from '../schemas/task.schema';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { AppError, ConflictError } from '../middlewares/error.middleware';
import { broadcastToProject, sendToUser } from '../socket';

export async function createTask(creatorId: string, projectId: string, input: CreateTaskInput) {
  const task = await prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('Project not found.', 404);
    }

    if (input.assigneeId) {
      const assignee = await tx.user.findUnique({ where: { id: input.assigneeId } });
      if (!assignee || !assignee.isActive) {
        throw new AppError('Assignee user not found or deactivated.', 400);
      }
    }

    const createdTask = await tx.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        version: 1,
        createdById: creatorId,
        assigneeId: input.assigneeId,
        dueDate: input.dueDate,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await recordActivity(
      {
        userId: creatorId,
        projectId,
        action: 'TASK_CREATED',
        entityType: 'Task',
        entityId: createdTask.id,
        metadata: { title: createdTask.title, status: createdTask.status, priority: createdTask.priority },
      },
      tx
    );

    if (input.assigneeId) {
      const notif = await createNotification(
        {
          userId: input.assigneeId,
          actorUserId: creatorId,
          type: 'TASK_ASSIGNED',
          title: 'New Task Assigned',
          message: `You were assigned to task "${createdTask.title}" in project "${project.name}"`,
          link: `/projects/${projectId}/tasks`,
        },
        tx
      );

      if (notif) {
        sendToUser(input.assigneeId, 'notification:new', notif);
      }
    }

    return createdTask;
  });

  // Broadcast real-time event to project channel
  broadcastToProject(projectId, 'task:created', task);

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

export async function getTaskById(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      comments: {
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

export async function updateTask(actorUserId: string, taskId: string, input: UpdateTaskInput) {
  const { updatedTask, projectId, newNotif } = await prisma.$transaction(async (tx) => {
    const existingTask = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { name: true } },
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingTask) {
      throw new AppError('Task not found.', 404);
    }

    const dataToUpdate: any = {
      version: { increment: 1 },
    };

    if (input.title !== undefined) dataToUpdate.title = input.title;
    if (input.description !== undefined) dataToUpdate.description = input.description;
    if (input.status !== undefined) dataToUpdate.status = input.status;
    if (input.priority !== undefined) dataToUpdate.priority = input.priority;
    if (input.assigneeId !== undefined) dataToUpdate.assigneeId = input.assigneeId;
    if (input.dueDate !== undefined) dataToUpdate.dueDate = input.dueDate;

    const result = await tx.task.updateMany({
      where: {
        id: taskId,
        version: input.version,
      },
      data: dataToUpdate,
    });

    if (result.count === 0) {
      const latestTask = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
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
      },
    });

    await recordActivity(
      {
        userId: actorUserId,
        projectId: existingTask.projectId,
        action: 'TASK_UPDATED',
        entityType: 'Task',
        entityId: taskId,
        metadata: {
          previousVersion: input.version,
          newVersion: updated!.version,
          changes: input,
        },
      },
      tx
    );

    let notifCreated: any = null;

    if (input.assigneeId && input.assigneeId !== existingTask.assigneeId) {
      notifCreated = await createNotification(
        {
          userId: input.assigneeId,
          actorUserId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned to You',
          message: `You were assigned to task "${updated!.title}" in "${existingTask.project.name}"`,
          link: `/projects/${existingTask.projectId}/tasks`,
        },
        tx
      );
    }

    if (input.status && input.status !== existingTask.status && updated?.assigneeId) {
      notifCreated = await createNotification(
        {
          userId: updated.assigneeId,
          actorUserId,
          type: 'TASK_STATUS_CHANGED',
          title: 'Task Status Updated',
          message: `Task "${updated.title}" status changed to ${updated.status}`,
          link: `/projects/${existingTask.projectId}/tasks`,
        },
        tx
      );
    }

    return {
      updatedTask: updated!,
      projectId: existingTask.projectId,
      newNotif: notifCreated,
    };
  });

  // Broadcast real-time events
  broadcastToProject(projectId, 'task:updated', updatedTask);
  if (newNotif) {
    sendToUser(newNotif.userId, 'notification:new', newNotif);
  }

  return updatedTask;
}

export async function updateTaskStatus(
  actorUserId: string,
  taskId: string,
  input: UpdateTaskStatusInput
) {
  return updateTask(actorUserId, taskId, {
    version: input.version,
    status: input.status,
  });
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
