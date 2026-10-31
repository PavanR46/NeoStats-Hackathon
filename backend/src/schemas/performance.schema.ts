import { z } from 'zod';

export const performanceQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type PerformanceQuery = z.infer<typeof performanceQuerySchema>;