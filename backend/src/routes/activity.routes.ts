import { Router } from 'express';
import { getActivitiesController } from '../controllers/activity.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', authorize('activity:read'), getActivitiesController);

export default router;
