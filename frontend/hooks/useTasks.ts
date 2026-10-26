'use client';

import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useTasks(projectId: string, filters: Record<string, any> = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(projectId, filters),
    queryFn: () => taskApi.list(projectId, filters),
    enabled: !!projectId,
  });
}

export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => taskApi.getById(id),
    enabled: !!id,
  });
}
