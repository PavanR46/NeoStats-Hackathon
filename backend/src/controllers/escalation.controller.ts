import { Request, Response, NextFunction } from 'express';
import { EscalationType } from '@prisma/client';
import * as escalationService from '../services/escalation.service';
import { escalateTaskSchema, getEscalationsQuerySchema } from '../schemas/escalation.schema';

export async function escalateTaskController(req: Request, res: Response, next: NextFunction) {
  try {
    const input = escalateTaskSchema.parse(req.body);
    const task = await escalationService.escalateTicket({
      taskId: req.params.id,
      type: EscalationType.MANUAL,
      reason: input.reason,
      actorUserId: req.user!.id,
      expectedVersion: input.version,
    });
    return res.status(200).json({ message: 'Ticket escalated successfully', task });
  } catch (error) {
    next(error);
  }
}

export async function getTaskEscalationsController(req: Request, res: Response, next: NextFunction) {
  try {
    const escalations = await escalationService.getTaskEscalations(req.params.id);
    return res.status(200).json({ escalations });
  } catch (error) {
    next(error);
  }
}

export async function listEscalationsController(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getEscalationsQuerySchema.parse(req.query);
    const result = await escalationService.listEscalations(req.user!, query);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}