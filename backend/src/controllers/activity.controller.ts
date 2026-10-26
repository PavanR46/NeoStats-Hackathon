import { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activity.service';
import { getActivitiesQuerySchema } from '../schemas/activity.schema';

export async function getActivitiesController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getActivitiesQuerySchema.parse(req.query);
    const projectId = req.params.projectId || (req.query.projectId as string);
    const result = await activityService.getActivities(req.user, projectId, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
