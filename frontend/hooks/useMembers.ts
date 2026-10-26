'use client';

import { useQuery } from '@tanstack/react-query';
import { memberApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useMembers(projectId: string) {
  return useQuery({
    queryKey: queryKeys.members.list(projectId),
    queryFn: () => memberApi.list(projectId),
    enabled: !!projectId,
  });
}
