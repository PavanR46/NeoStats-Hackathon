import { z } from 'zod';

export const getActivitiesQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  action: z.string().optional(),
  entityType: z.string().optional(),
});

export type GetActivitiesQuery = z.infer<typeof getActivitiesQuerySchema>;
