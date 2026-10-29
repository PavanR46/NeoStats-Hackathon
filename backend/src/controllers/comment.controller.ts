import { Request, Response, NextFunction } from 'express';
import * as commentService from '../services/comment.service';
import { createCommentSchema, getCommentsQuerySchema } from '../schemas/comment.schema';

function canSeeInternal(req: Request) {
  return req.user!.globalRole === 'ADMIN' || (req as any).projectRole !== 'VIEWER';
}

export async function createCommentController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCommentSchema.parse(req.body);
    const comment = await commentService.createComment(req.user!.id, req.params.taskId, input);
    return res.status(201).json({ message: 'Comment created successfully', comment });
  } catch (error) {
    next(error);
  }
}

export async function getCommentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getCommentsQuerySchema.parse(req.query);
    const result = await commentService.getComments(req.params.taskId, query, canSeeInternal(req));
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function deleteCommentController(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await commentService.deleteComment(req.user!.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
