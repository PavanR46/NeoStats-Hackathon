import { Router } from 'express';
import {
  addMemberController,
  getMembersController,
  updateMemberRoleController,
  removeMemberController,
} from '../controllers/member.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/', authorize('member:add'), addMemberController);
router.get('/', authorize('member:read'), getMembersController);
router.patch('/:memberId', authorize('member:update_role'), updateMemberRoleController);
router.delete('/:memberId', authorize('member:remove'), removeMemberController);

export default router;
