'use client';

import { useQuery } from '@tanstack/react-query';
import { performanceApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { PerformanceMatrix } from '@/lib/performance';

export function usePerformance(days: number) {
  return useQuery<PerformanceMatrix>({
    queryKey: queryKeys.performance.matrix({ days }),
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
      return performanceApi.matrix({ from: from.toISOString(), to: to.toISOString() });
    },
  });
}

