import { z } from 'zod';

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty'),
});

export const getCommentsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
