import { Request, Response, NextFunction } from 'express';
import * as memberService from '../services/member.service';
import { addMemberSchema, updateMemberRoleSchema } from '../schemas/member.schema';

export async function addMemberController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = addMemberSchema.parse(req.body);
    const member = await memberService.addMember(req.user!.id, req.params.projectId, input);
    return res.status(201).json({ message: 'Member added to project successfully', member });
  } catch (error) {
    next(error);
  }
}

export async function getMembersController(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await memberService.getMembers(req.params.projectId);
    return res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRoleController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateMemberRoleSchema.parse(req.body);
    const member = await memberService.updateMemberRole(
      req.user!.id,
      req.params.projectId,
      req.params.memberId,
      input
    );
    return res.status(200).json({ message: 'Member role updated successfully', member });
  } catch (error) {
    next(error);
  }
}

export async function removeMemberController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await memberService.removeMember(
      req.user!.id,
      req.params.projectId,
      req.params.memberId
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
