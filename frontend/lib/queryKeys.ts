export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (filters: Record<string, any>) => ['projects', filters] as const,
    detail: (id: string) => ['project', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: Record<string, any>) => ['users', filters] as const,
    detail: (id: string) => ['user', id] as const,
  },
  members: {
    list: (projectId: string) => ['members', projectId] as const,
  },
  tasks: {
    list: (projectId: string, filters: Record<string, any> = {}) => ['tasks', projectId, filters] as const,
    detail: (id: string) => ['task', id] as const,
  },
  comments: {
    list: (taskId: string) => ['comments', taskId] as const,
  },
  activity: {
    project: (projectId: string) => ['activity', 'project', projectId] as const,
    global: ['activity', 'global'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: Record<string, any> = {}) => ['notifications', filters] as const,
  },
};
