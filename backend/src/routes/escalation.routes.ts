import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { listEscalationsController } from '../controllers/escalation.controller';

const router = Router();

router.use(requireAuth);
router.get('/', listEscalationsController); // the service scopes results by role

export default router;