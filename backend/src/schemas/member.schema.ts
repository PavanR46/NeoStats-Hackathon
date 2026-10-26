import { z } from 'zod';
import { ProjectRole } from '@prisma/client';

export const addMemberSchema = z.object({
  userId: z.string().uuid('Invalid User ID format'),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.TEAM_MEMBER),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
