import { Router } from 'express';
import {
  createUserController,
  getUsersController,
  getUserByIdController,
  updateUserController,
  deactivateUserController,
} from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', authorize('user:manage'), createUserController);
router.get('/', authorize('user:read'), getUsersController);
router.get('/:id', authorize('user:read'), getUserByIdController);
router.patch('/:id', authorize('user:manage'), updateUserController);
router.patch('/:id/deactivate', authorize('user:manage'), deactivateUserController);

export default router;
