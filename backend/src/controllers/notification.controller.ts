import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { getNotificationsQuerySchema } from '../schemas/notification.schema';

export async function getNotificationsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getNotificationsQuerySchema.parse(req.query);
    const result = await notificationService.getNotifications(req.user!.id, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function markAsReadController(req: Request, res: Response, next: NextFunction) {
  try {
    const notification = await notificationService.markAsRead(req.user!.id, req.params.id);
    return res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsReadController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await notificationService.markAllAsRead(req.user!.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
