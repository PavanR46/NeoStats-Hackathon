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
      if (action.startsWith('user:') || action === 'project:create') {
        throw new AppError('Forbidden. Admin rights required.', 403);
      }

    // 3. Resolve the project from the RESOURCE (never trust ids the client controls)
    const projectId = await resolveProjectId(req);

    if (!projectId && action === 'activity:read') {
      return next(); // global feed: the service filters by memberships
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
      if (member.role === ProjectRole.TEAM_MEMBER && (action === 'task:update' || action === 'task:change_status' || action === 'task:escalate')) {
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
async function resolveProjectId(req: Request): Promise<string | undefined> {
  const base = req.baseUrl;
  let projectId: string | undefined;

  if (base.endsWith('/comments') && req.params.id) {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.id },
      select: { userId: true, task: { select: { id: true, projectId: true } } },
    });
    if (!comment) throw new AppError('Comment not found.', 404);
    if (req.params.taskId && comment.task.id !== req.params.taskId) {
      throw new AppError('Comment not found on this task.', 404);
    }
    (req as any).targetComment = comment;
    projectId = comment.task.projectId;
  } else {
    const taskId = req.params.taskId ?? (base.endsWith('/tasks') ? req.params.id : undefined);
    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { projectId: true, assigneeId: true },
      });
      if (!task) throw new AppError('Task not found.', 404);
      (req as any).targetTask = task;
      projectId = task.projectId;
    } else {
      projectId = req.params.projectId ?? (base.endsWith('/projects') ? req.params.id : undefined);
    }
  }

  // If the URL names a project, it must match the resource's real project
  if (req.params.projectId && projectId && req.params.projectId !== projectId) {
    throw new AppError('Resource not found in this project.', 404);
  }
  return projectId;
}
