import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { getPerformanceMatrixController } from '../controllers/performance.controller';

const router = Router();

router.use(requireAuth);
router.get('/matrix', getPerformanceMatrixController); // the service decides what each role may see

export default router;