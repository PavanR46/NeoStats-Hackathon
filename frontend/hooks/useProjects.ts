'use client';

import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useProjects(filters: { page?: number; limit?: number; search?: string; isArchived?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => projectApi.list(filters),
  });
}

export function useProjectDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => projectApi.getById(id),
    enabled: !!id,
  });
}
