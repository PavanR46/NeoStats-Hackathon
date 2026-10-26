import { Router } from 'express';
import {
  createTaskController,
  getTasksController,
  getTaskByIdController,
  updateTaskController,
  updateTaskStatusController,
  deleteTaskController,
} from '../controllers/task.controller';
import commentRoutes from './comment.routes';
import { requireAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

// Mount comment routes under /api/tasks/:taskId/comments
router.use('/:taskId/comments', commentRoutes);

router.post('/', authorize('task:create'), createTaskController);
router.get('/', authorize('task:read'), getTasksController);
router.get('/:id', authorize('task:read'), getTaskByIdController);
router.patch('/:id', authorize('task:update'), updateTaskController);
router.patch('/:id/status', authorize('task:change_status'), updateTaskStatusController);
router.delete('/:id', authorize('task:delete'), deleteTaskController);

export default router;
