'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { escalationApi } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { priorityStyles, statusStyles } from '@/lib/styles';
import { ESCALATION_LEVELS } from '@/lib/sla';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';

const TYPE_STYLES: Record<string, { label: string; badge: string }> = {
  MANUAL: { label: 'Manual', badge: 'bg-surface-2 text-fg-muted border-line' },
  SLA_BREACH: { label: 'SLA breach', badge: 'bg-danger/10 text-danger border-danger/25' },
};

export default function EscalationsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.escalations.list({ page, type }),
    queryFn: () => escalationApi.list({ page, limit: 10, type: type || undefined }),
    placeholderData: (previous) => previous,
  });

  const items = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticket"
        accent="Escalations"
        description="Tickets that moved up a level, manually or because an SLA deadline was missed."
        actions={
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by type"
            className="input w-auto"
          >
            <option value="">All types</option>
            <option value="MANUAL">Manual</option>
            <option value="SLA_BREACH">SLA breach</option>
          </select>
        }
      />

      {isLoading && <SkeletonRows count={3} height="h-24" />}

      {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6" />}
          title="No escalations"
          description="Nothing has been escalated, which is a good sign."
        />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {items.map((e: any) => (
            <div key={e.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/tasks/${e.task.id}`} className="text-sm font-semibold text-accent hover:underline">
                    #{e.task.ticketNumber} {e.task.title}
                  </Link>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[e.task.priority]?.badge}`}>
                    {priorityStyles[e.task.priority]?.label}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyles[e.task.status]?.badge}`}>
                    {statusStyles[e.task.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-fg-muted">{e.reason}</p>
                <p className="text-[11px] text-fg-subtle">
                  {e.task.project?.name} · {new Date(e.createdAt).toLocaleString()} ·{' '}
                  {e.escalatedBy ? `by ${e.escalatedBy.name}` : 'automatic (SLA worker)'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_STYLES[e.type]?.badge}`}>
                  {TYPE_STYLES[e.type]?.label}
                </span>
                <span className="font-medium text-fg-muted">{e.fromAssignee?.name ?? 'Unassigned'}</span>
                <ArrowRight className="h-3.5 w-3.5 text-fg-subtle" />
                <span className="font-medium text-fg">{e.escalatedTo?.name ?? 'Nobody available'}</span>
                <span className="text-fg-subtle">
                  ({ESCALATION_LEVELS[e.fromLevel]} → {ESCALATION_LEVELS[e.toLevel]})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost">
            Previous
          </button>
          <span className="text-fg-muted">
            Page {page} of {totalPages}
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

