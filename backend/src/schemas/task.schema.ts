import { z } from 'zod';
import { TaskStatus, TaskPriority } from '@prisma/client';

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters long'),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assigneeId: z.string().uuid().nullable().optional(),
  requesterId: z.string().uuid().nullable().optional(),
  category: z.string().max(50).optional(),
  dueDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const updateTaskSchema = z.object({
  version: z.number({ required_error: 'Task version is required for optimistic concurrency locking' }),
  title: z.string().min(2, 'Task title must be at least 2 characters long').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  category: z.string().max(50).optional(),
  dueDate: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === null ? null : val ? new Date(val) : undefined)),
});

export const updateTaskStatusSchema = z.object({
  version: z.number({ required_error: 'Task version is required for optimistic concurrency locking' }),
  status: z.nativeEnum(TaskStatus),
});

export const getTasksQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  search: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;
