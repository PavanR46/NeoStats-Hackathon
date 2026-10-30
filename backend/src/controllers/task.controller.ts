import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/task.service';
import { AppError } from '../middlewares/error.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  getTasksQuerySchema,
} from '../schemas/task.schema';

// Admin or Project Manager of the ticket's project
function isLead(req: Request) {
  return req.user!.globalRole === 'ADMIN' || (req as any).projectRole === 'PROJECT_MANAGER';
}

// Viewers must never see internal notes
function canSeeInternal(req: Request) {
  return req.user!.globalRole === 'ADMIN' || (req as any).projectRole !== 'VIEWER';
}

export async function createTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.params.projectId) {
      throw new AppError('Use /api/projects/:projectId/tasks for this operation.', 400);
    }
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.createTask(req.user!.id, req.params.projectId, input);
    return res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next(error);
  }
}

export async function getTasksController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.params.projectId) {
      throw new AppError('Use /api/projects/:projectId/tasks for this operation.', 400);
    }
    const query = getTasksQuerySchema.parse(req.query);
    const result = await taskService.getTasks(req.params.projectId, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTaskByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await taskService.getTaskById(req.params.id, canSeeInternal(req));
    return res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskSchema.parse(req.body);
    // FIXED: Passed isLead(req) so authorized PMs/Admins can perform updates
    const task = await taskService.updateTask(req.user!.id, req.params.id, input, isLead(req));
    return res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskStatusSchema.parse(req.body);
    // FIXED: Passed isLead(req) so authorized PMs/Admins can update statuses/close tickets
    const task = await taskService.updateTaskStatus(req.user!.id, req.params.id, input, isLead(req));
    return res.status(200).json({ message: 'Task status updated successfully', task });
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await taskService.deleteTask(req.user!.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}