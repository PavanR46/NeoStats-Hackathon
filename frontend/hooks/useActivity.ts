'use client';

import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useGlobalActivity(page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.activity.global,
    queryFn: () => activityApi.list(undefined, page, limit),
  });
}

export function useProjectActivity(projectId: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: queryKeys.activity.project(projectId),
    queryFn: () => activityApi.listByProject(projectId, page, limit),
    enabled: !!projectId,
  });
}
