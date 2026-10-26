import { Router } from 'express';
import {
  createCommentController,
  getCommentsController,
  deleteCommentController,
} from '../controllers/comment.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/', authorize('comment:create'), createCommentController);
router.get('/', authorize('comment:read'), getCommentsController);
router.delete('/:id', authorize('comment:delete'), deleteCommentController);

export default router;
