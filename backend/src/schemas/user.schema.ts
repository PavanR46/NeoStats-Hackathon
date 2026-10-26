import { z } from 'zod';
import { GlobalRole } from '@prisma/client';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  globalRole: z.nativeEnum(GlobalRole).default(GlobalRole.USER),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').optional(),
  email: z.string().email('Invalid email format').optional(),
  globalRole: z.nativeEnum(GlobalRole).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
});

export const getUsersQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  globalRole: z.nativeEnum(GlobalRole).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type GetUsersQuery = z.infer<typeof getUsersQuerySchema>;
