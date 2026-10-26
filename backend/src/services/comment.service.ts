import { prisma } from '../db/prisma';
import { CreateCommentInput, GetCommentsQuery } from '../schemas/comment.schema';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { AppError } from '../middlewares/error.middleware';
import { broadcastToProject, sendToUser } from '../socket';

export async function createComment(actorUserId: string, taskId: string, input: CreateCommentInput) {
  const { comment, task, mentionedUsers } = await prisma.$transaction(async (tx) => {
    const taskRecord = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    if (!taskRecord) {
      throw new AppError('Task not found.', 404);
    }

    const createdComment = await tx.comment.create({
      data: {
        taskId,
        userId: actorUserId,
        content: input.content,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await recordActivity(
      {
        userId: actorUserId,
        projectId: taskRecord.projectId,
        action: 'COMMENT_CREATED',
        entityType: 'Comment',
        entityId: createdComment.id,
        metadata: { taskId, contentSnippet: input.content.substring(0, 50) },
      },
      tx
    );

    // 1. Notify task assignee if different from actor
    if (taskRecord.assigneeId && taskRecord.assigneeId !== actorUserId) {
      const notif = await createNotification(
        {
          userId: taskRecord.assigneeId,
          actorUserId,
          type: 'TASK_COMMENT',
          title: 'New Comment on Task',
          message: `${createdComment.user.name} commented on "${taskRecord.title}": ${input.content.substring(0, 40)}...`,
          link: `/projects/${taskRecord.projectId}/tasks`,
        },
        tx
      );
      if (notif) sendToUser(taskRecord.assigneeId, 'notification:new', notif);
    }

    // 2. PARSE @MENTIONS in comment text (e.g. @Alex or @member@neostats.com)
    const mentionRegex = /@([a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._-]+)?)/g;
    const matches = Array.from(input.content.matchAll(mentionRegex), (m) => m[1]);

    const mentionedUserRecords: string[] = [];

    if (matches.length > 0) {
      // Find project members matching handles
      const projectMembers = await tx.projectMember.findMany({
        where: { projectId: taskRecord.projectId },
        include: { user: true },
      });

      for (const handle of matches) {
        const lowerHandle = handle.toLowerCase();
        const matchedMember = projectMembers.find(
          (m) =>
            m.userId !== actorUserId &&
            (m.user.email.toLowerCase().includes(lowerHandle) ||
              m.user.name.toLowerCase().replace(/\s+/g, '').includes(lowerHandle))
        );

        if (matchedMember && !mentionedUserRecords.includes(matchedMember.userId)) {
          mentionedUserRecords.push(matchedMember.userId);

          const notif = await createNotification(
            {
              userId: matchedMember.userId,
              actorUserId,
              type: 'MENTION',
              title: 'You were mentioned in a comment',
              message: `${createdComment.user.name} mentioned you in a comment on "${taskRecord.title}"`,
              link: `/projects/${taskRecord.projectId}/tasks`,
            },
            tx
          );

          if (notif) sendToUser(matchedMember.userId, 'notification:new', notif);
        }
      }
    }

    return { comment: createdComment, task: taskRecord, mentionedUsers: mentionedUserRecords };
  });

  // Broadcast real-time comment creation to project channel
  broadcastToProject(task.projectId, 'comment:created', comment);

  return comment;
}

export async function getComments(taskId: string, query: GetCommentsQuery) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [total, comments] = await Promise.all([
    prisma.comment.count({ where: { taskId } }),
    prisma.comment.findMany({
      where: { taskId },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    data: comments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function deleteComment(actorUserId: string, commentId: string) {
  const { projectId, taskId } = await prisma.$transaction(async (tx) => {
    const comment = await tx.comment.findUnique({
      where: { id: commentId },
      include: {
        task: { select: { projectId: true } },
      },
    });

    if (!comment) {
      throw new AppError('Comment not found.', 404);
    }

    await tx.comment.delete({ where: { id: commentId } });

    await recordActivity(
      {
        userId: actorUserId,
        projectId: comment.task.projectId,
        action: 'COMMENT_DELETED',
        entityType: 'Comment',
        entityId: commentId,
      },
      tx
    );

    return { projectId: comment.task.projectId, taskId: comment.taskId };
  });

  broadcastToProject(projectId, 'comment:deleted', { commentId, taskId });

  return { message: 'Comment deleted successfully' };
}
