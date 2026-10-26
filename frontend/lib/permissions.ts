export type Action =
  | 'user:read'
  | 'user:manage'
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:archive'
  | 'project:delete'
  | 'member:add'
  | 'member:remove'
  | 'member:update_role'
  | 'member:read'
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'task:assign'
  | 'task:change_status'
  | 'comment:create'
  | 'comment:read'
  | 'comment:delete'
  | 'activity:read';

export interface UserPermissionsContext {
  globalRole?: string;
  projectRole?: string | null;
  userId?: string;
}

export function can(
  userCtx: UserPermissionsContext,
  action: Action,
  resourceContext?: { assigneeId?: string | null; authorId?: string }
): boolean {
  if (!userCtx) return false;

  // Global Admin Bypass
  if (userCtx.globalRole === 'ADMIN') {
    return true;
  }

  // Global Actions
  if (action.startsWith('user:')) {
    return false;
  }

  const role = userCtx.projectRole;
  if (!role) return false;

  switch (role) {
    case 'PROJECT_MANAGER':
      return true;

    case 'TEAM_MEMBER':
      if (
        action === 'project:read' ||
        action === 'member:read' ||
        action === 'task:read' ||
        action === 'comment:create' ||
        action === 'comment:read' ||
        action === 'activity:read'
      ) {
        return true;
      }

      // Team members can update tasks assigned to them
      if (action === 'task:update' || action === 'task:change_status') {
        if (resourceContext?.assigneeId && userCtx.userId) {
          return resourceContext.assigneeId === userCtx.userId;
        }
        return true; // default visible, server enforces exact check
      }

      // Team members can delete comments created by themselves
      if (action === 'comment:delete') {
        if (resourceContext?.authorId && userCtx.userId) {
          return resourceContext.authorId === userCtx.userId;
        }
        return true;
      }
      return false;

    case 'VIEWER':
      return (
        action === 'project:read' ||
        action === 'member:read' ||
        action === 'task:read' ||
        action === 'comment:read' ||
        action === 'activity:read'
      );

    default:
      return false;
  }
}
