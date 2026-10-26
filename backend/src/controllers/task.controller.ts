import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/task.service';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  getTasksQuerySchema,
} from '../schemas/task.schema';

export async function createTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.createTask(req.user!.id, req.params.projectId, input);
    return res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next(error);
  }
}

export async function getTasksController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getTasksQuerySchema.parse(req.query);
    const result = await taskService.getTasks(req.params.projectId, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTaskByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await taskService.getTaskById(req.params.id);
    return res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.user!.id, req.params.id, input);
    return res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskStatusSchema.parse(req.body);
    const task = await taskService.updateTaskStatus(req.user!.id, req.params.id, input);
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
