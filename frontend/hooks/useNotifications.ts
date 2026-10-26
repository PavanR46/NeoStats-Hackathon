'use client';

import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useNotifications(isRead?: boolean) {
  return useQuery({
    queryKey: queryKeys.notifications.list({ isRead }),
    queryFn: () => notificationApi.list(1, 30, isRead),
  });
}
