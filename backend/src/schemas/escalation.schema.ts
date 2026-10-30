import { z } from 'zod';

export const escalateTaskSchema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters)').max(500),
});

export const getEscalationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  projectId: z.string().uuid().optional(),
  type: z.enum(['MANUAL', 'SLA_BREACH']).optional(),
});

export type EscalateTaskInput = z.infer<typeof escalateTaskSchema>;
export type GetEscalationsQuery = z.infer<typeof getEscalationsQuerySchema>;