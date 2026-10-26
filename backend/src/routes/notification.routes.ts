import { Router } from 'express';
import {
  getNotificationsController,
  markAsReadController,
  markAllAsReadController,
} from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getNotificationsController);
router.patch('/read-all', markAllAsReadController);
router.patch('/:id/read', markAsReadController);

export default router;
