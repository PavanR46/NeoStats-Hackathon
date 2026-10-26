const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: any;
  public latestTask?: any;

  constructor(status: number, message: string, code?: string, details?: any, latestTask?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.latestTask = latestTask;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 401 Unauthorized -> Redirect to login if in browser
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }

    throw new ApiError(
      res.status,
      data.error?.message || 'An unexpected server error occurred',
      data.error?.code,
      data.error?.details,
      data.latestTask
    );
  }

  return data as T;
}

// Authentication API calls
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ message: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    fetchApi<{ user: any }>('/auth/me', {
      method: 'GET',
    }),
};

// Projects API
export const projectApi = {
  create: (name: string, description?: string) =>
    fetchApi<{ message: string; project: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  list: (query: { page?: number; limit?: number; search?: string; isArchived?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.isArchived !== undefined) params.append('isArchived', query.isArchived.toString());
    return fetchApi<{ data: any[]; pagination: any }>(`/projects?${params.toString()}`);
  },

  getById: (id: string) => fetchApi<{ project: any }>(`/projects/${id}`),

  update: (id: string, data: { name?: string; description?: string; isArchived?: boolean }) =>
    fetchApi<{ message: string; project: any }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  archive: (id: string) =>
    fetchApi<{ message: string; project: any }>(`/projects/${id}/archive`, {
      method: 'PATCH',
    }),
};

// Users API
export const userApi = {
  list: (query: { page?: number; limit?: number; search?: string; globalRole?: string; isActive?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.globalRole) params.append('globalRole', query.globalRole);
    if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
    return fetchApi<{ data: any[]; pagination: any }>(`/users?${params.toString()}`);
  },

  create: (data: { email: string; password: string; name: string; globalRole?: string }) =>
    fetchApi<{ message: string; user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; email?: string; globalRole?: string; password?: string }) =>
    fetchApi<{ message: string; user: any }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deactivate: (id: string) =>
    fetchApi<{ message: string; user: any }>(`/users/${id}/deactivate`, {
      method: 'PATCH',
    }),
};

// Members API
export const memberApi = {
  list: (projectId: string) => fetchApi<{ members: any[] }>(`/projects/${projectId}/members`),

  add: (projectId: string, data: { userId: string; role: string }) =>
    fetchApi<{ message: string; member: any }>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRole: (projectId: string, memberId: string, role: string) =>
    fetchApi<{ message: string; member: any }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  remove: (projectId: string, memberId: string) =>
    fetchApi<{ message: string }>(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    }),
};

// Tasks API
export const taskApi = {
  list: (projectId: string, query: { page?: number; limit?: number; search?: string; status?: string; priority?: string; assigneeId?: string } = {}) => {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.search) params.append('search', query.search);
    if (query.status) params.append('status', query.status);
    if (query.priority) params.append('priority', query.priority);
    if (query.assigneeId) params.append('assigneeId', query.assigneeId);
    return fetchApi<{ data: any[]; pagination: any }>(`/projects/${projectId}/tasks?${params.toString()}`);
  },

  getById: (id: string) => fetchApi<{ task: any }>(`/tasks/${id}`),

  create: (projectId: string, data: { title: string; description?: string; status?: string; priority?: string; assigneeId?: string | null; dueDate?: string }) =>
    fetchApi<{ message: string; task: any }>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { version: number; title?: string; description?: string; status?: string; priority?: string; assigneeId?: string | null; dueDate?: string | null }) =>
    fetchApi<{ message: string; task: any }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, data: { version: number; status: string }) =>
    fetchApi<{ message: string; task: any }>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),
};

// Comments API
export const commentApi = {
  list: (taskId: string, page = 1, limit = 20) =>
    fetchApi<{ data: any[]; pagination: any }>(`/tasks/${taskId}/comments?page=${page}&limit=${limit}`),

  create: (taskId: string, content: string) =>
    fetchApi<{ message: string; comment: any }>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/comments/${id}`, {
      method: 'DELETE',
    }),
};

// Activity API
export const activityApi = {
  list: (projectId?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (projectId) params.append('projectId', projectId);
    return fetchApi<{ data: any[]; pagination: any }>(`/activity?${params.toString()}`);
  },

  listByProject: (projectId: string, page = 1, limit = 20) =>
    fetchApi<{ data: any[]; pagination: any }>(`/projects/${projectId}/activity?page=${page}&limit=${limit}`),
};

// Notifications API
export const notificationApi = {
  list: (page = 1, limit = 20, isRead?: boolean) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (isRead !== undefined) params.append('isRead', isRead.toString());
    return fetchApi<{ data: any[]; unreadCount: number; pagination: any }>(`/notifications?${params.toString()}`);
  },

  markAsRead: (id: string) =>
    fetchApi<{ message: string; notification: any }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllAsRead: () =>
    fetchApi<{ message: string }>('/notifications/read-all', {
      method: 'PATCH',
    }),
};
