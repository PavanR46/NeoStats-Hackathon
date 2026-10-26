import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { Action, hasProjectRolePermission } from '../config/permissions';
import { AppError } from './error.middleware';
import { ProjectRole } from '@prisma/client';

export interface AuthorizeOptions {
  action: Action;
  getProjectId?: (req: Request) => Promise<string | undefined> | string | undefined;
}

export function authorize(action: Action, getProjectIdFromReq?: (req: Request) => string | undefined) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('Authentication required.', 401);
      }

      // 1. GLOBAL ADMIN BYPASS
      if (user.globalRole === 'ADMIN') {
        return next();
      }

      // 2. Global Actions (User Management)
      if (action.startsWith('user:')) {
        throw new AppError('Forbidden. Admin rights required.', 403);
      }

      // 3. Resolve Project ID
      let projectId: string | undefined;

      if (getProjectIdFromReq) {
        projectId = getProjectIdFromReq(req);
      } else if (req.params.projectId) {
        projectId = req.params.projectId;
      } else if (req.params.id && req.baseUrl.includes('/projects')) {
        projectId = req.params.id;
      } else if (req.body?.projectId) {
        projectId = req.body.projectId;
      }

      // Task or Comment direct route resolution if projectId not directly in params
      if (!projectId && req.params.id) {
        if (req.baseUrl.includes('/tasks') || action.startsWith('task:')) {
          const task = await prisma.task.findUnique({
            where: { id: req.params.id },
            select: { projectId: true, assigneeId: true },
          });
          if (!task) {
            throw new AppError('Task not found.', 404);
          }
          projectId = task.projectId;
          (req as any).targetTask = task;
        } else if (req.baseUrl.includes('/comments') || action.startsWith('comment:')) {
          const comment = await prisma.comment.findUnique({
            where: { id: req.params.id },
            select: { userId: true, task: { select: { projectId: true } } },
          });
          if (!comment) {
            throw new AppError('Comment not found.', 404);
          }
          projectId = comment.task.projectId;
          (req as any).targetComment = comment;
        }
      }

      if (!projectId && action === 'activity:read') {
        return next();
      }

      if (!projectId) {
        throw new AppError('Unable to resolve project context for permission check.', 400);
      }

      // 4. Fetch Project Membership
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: user.id,
          },
        },
      });

      if (!member) {
        throw new AppError('Forbidden. You are not a member of this project.', 403);
      }

      // Attach member role to request for downstream handlers
      (req as any).projectRole = member.role;

      // 5. Matrix Permission Evaluation
      const allowed = hasProjectRolePermission(member.role, action);
      if (!allowed) {
        throw new AppError(`Forbidden. Role '${member.role}' lacks permission for '${action}'.`, 403);
      }

      // 6. Contextual Constraint Checks
      // Rule: Team Members may ONLY edit or change status of tasks assigned to them
      if (member.role === ProjectRole.TEAM_MEMBER && (action === 'task:update' || action === 'task:change_status')) {
        let taskAssigneeId = (req as any).targetTask?.assigneeId;

        if (!taskAssigneeId && req.params.id) {
          const existingTask = await prisma.task.findUnique({
            where: { id: req.params.id },
            select: { assigneeId: true },
          });
          taskAssigneeId = existingTask?.assigneeId;
        }

        if (taskAssigneeId !== user.id) {
          throw new AppError('Forbidden. Team Members can only update tasks assigned to them.', 403);
        }
      }

      // Rule: Comment Delete = Author or PM/Admin
      if (member.role === ProjectRole.TEAM_MEMBER && action === 'comment:delete') {
        let commentAuthorId = (req as any).targetComment?.userId;

        if (!commentAuthorId && req.params.id) {
          const existingComment = await prisma.comment.findUnique({
            where: { id: req.params.id },
            select: { userId: true },
          });
          commentAuthorId = existingComment?.userId;
        }

        if (commentAuthorId !== user.id) {
          throw new AppError('Forbidden. You can only delete comments created by yourself.', 403);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
