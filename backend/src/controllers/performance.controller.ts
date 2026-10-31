import { Request, Response, NextFunction } from 'express';
import * as performanceService from '../services/performance.service';
import { performanceQuerySchema } from '../schemas/performance.schema';

export async function getPerformanceMatrixController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = performanceQuerySchema.parse(req.query);
    const result = await performanceService.getPerformanceMatrix(req.user!, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}