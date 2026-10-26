import { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service';
import { createProjectSchema, updateProjectSchema, getProjectsQuerySchema } from '../schemas/project.schema';

export async function createProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.createProject(req.user!.id, input);
    return res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    next(error);
  }
}

export async function getProjectsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getProjectsQuerySchema.parse(req.query);
    const result = await projectService.getProjects(req.user!, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getProjectByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getProjectById(req.user!.id, req.user!.globalRole, req.params.id);
    return res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
}

export async function updateProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.updateProject(req.user!.id, req.params.id, input);
    return res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error) {
    next(error);
  }
}

export async function archiveProjectController(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.archiveProject(req.user!.id, req.params.id);
    return res.status(200).json({ message: 'Project archived successfully', project });
  } catch (error) {
    next(error);
  }
}
