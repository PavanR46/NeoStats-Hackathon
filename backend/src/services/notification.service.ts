import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { GetNotificationsQuery } from '../schemas/notification.schema';
import { AppError } from '../middlewares/error.middleware';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  actorUserId?: string;
}

export async function createNotification(
  input: CreateNotificationInput,
  tx?: Prisma.TransactionClient
) {
  // Never notify the actor about their own action
  if (input.actorUserId && input.actorUserId === input.userId) {
    return null;
  }

  const db = tx || prisma;
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      isRead: false,
    },
  });
}

export async function getNotifications(userId: string, query: GetNotificationsQuery) {
  const { page = 1, limit = 20, isRead } = query;
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (isRead !== undefined) {
    where.isRead = isRead;
  }

  const [total, unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    data: notifications,
    unreadCount,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new AppError('Notification not found.', 404);
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { message: 'All notifications marked as read' };
}
