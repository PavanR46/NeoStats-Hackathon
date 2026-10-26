import { ProjectRole } from '@prisma/client';

export type Action =
  // User Admin Actions
  | 'user:read'
  | 'user:manage'
  // Project Actions
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:archive'
  | 'project:delete'
  // Member Actions
  | 'member:add'
  | 'member:remove'
  | 'member:update_role'
  | 'member:read'
  // Task Actions
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'task:assign'
  | 'task:change_status'
  // Comment Actions
  | 'comment:create'
  | 'comment:read'
  | 'comment:delete'
  // Activity Log Actions
  | 'activity:read';

// Central Permission Matrix for Project-Level Roles
const PROJECT_ROLE_PERMISSIONS: Record<ProjectRole, Set<Action>> = {
  PROJECT_MANAGER: new Set<Action>([
    'project:read',
    'project:update',
    'project:archive',
    'member:add',
    'member:remove',
    'member:update_role',
    'member:read',
    'task:create',
    'task:read',
    'task:update',
    'task:delete',
    'task:assign',
    'task:change_status',
    'comment:create',
    'comment:read',
    'comment:delete',
    'activity:read',
  ]),
  TEAM_MEMBER: new Set<Action>([
    'project:read',
    'member:read',
    'task:read',
    'task:update', // Subject to assignment check in authorize middleware
    'task:change_status', // Subject to assignment check in authorize middleware
    'comment:create',
    'comment:read',
    'comment:delete', // Subject to ownership check in authorize middleware
    'activity:read',
  ]),
  VIEWER: new Set<Action>([
    'project:read',
    'member:read',
    'task:read',
    'comment:read',
    'activity:read',
  ]),
};

/**
 * Evaluates whether a project role has permission for a specific action.
 */
export function hasProjectRolePermission(role: ProjectRole, action: Action): boolean {
  return PROJECT_ROLE_PERMISSIONS[role]?.has(action) ?? false;
}
