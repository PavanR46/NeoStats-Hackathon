'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { getSlaInfo } from '@/lib/sla';
import { useNow } from '@/hooks/useNow';

export function SlaBadge({ task }: { task: any }) {
  const now = useNow();
  const info = getSlaInfo(task, now);

  if (info.state === 'none') return null;

  return (
    <span
      title="Resolution SLA"
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${info.classes}`}
    >
      <Clock className="h-3 w-3" />
      {info.label}
    </span>
  );
}