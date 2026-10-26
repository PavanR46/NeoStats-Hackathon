import { Router } from 'express';
import {
  createProjectController,
  getProjectsController,
  getProjectByIdController,
  updateProjectController,
  archiveProjectController,
} from '../controllers/project.controller';
import memberRoutes from './member.routes';
import taskRoutes from './task.routes';
import activityRoutes from './activity.routes';
import { requireAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

router.use(requireAuth);

// Mount Member routes under /api/projects/:projectId/members
router.use('/:projectId/members', memberRoutes);

// Mount Task routes under /api/projects/:projectId/tasks
router.use('/:projectId/tasks', taskRoutes);

// Mount Activity routes under /api/projects/:projectId/activity
router.use('/:projectId/activity', activityRoutes);

router.post('/', authorize('project:create'), createProjectController);
router.get('/', getProjectsController);
router.get('/:id', authorize('project:read'), getProjectByIdController);
router.patch('/:id', authorize('project:update'), updateProjectController);
router.patch('/:id/archive', authorize('project:archive'), archiveProjectController);

export default router;
