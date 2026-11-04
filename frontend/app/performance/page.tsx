'use client';

import React, { useState } from 'react';
import { BarChart3, Info, RefreshCw } from 'lucide-react';
import { usePerformance } from '@/hooks/usePerformance';
import { bandStyles, cellTone, metricColumns } from '@/lib/performance';
import { getAvatarColor, getInitials } from '@/lib/styles';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';

const PERIODS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

const SCOPE_TEXT = {
  ALL: 'All teams',
  TEAM: 'Teams you manage',
  SELF: 'Your own performance',
} as const;

export default function PerformancePage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, error, refetch, isFetching } = usePerformance(days);

  const rows = data?.rows ?? [];
  const targetOf = (key: string) => data?.targets.find((t) => t.metric === key);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        accent="Matrix"
        description={`${data ? SCOPE_TEXT[data.scope] : 'Loading'} · key performance metrics per employee, measured against targets.`}
        actions={
          <>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="Time period"
              className="input w-auto"
            >
              {PERIODS.map((p) => (
                <option key={p.days} value={p.days}>
                  {p.label}
                </option>
              ))}
            </select>
            <button onClick={() => refetch()} className="btn-ghost" aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      />

      {isLoading && <SkeletonRows count={4} />}

      {isError && <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />}

      {!isLoading && !isError && rows.length === 0 && (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="No people to show yet"
          description="Performance appears once team members resolve tickets."
        />
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Tickets</th>
                  {metricColumns.map((col) => {
                    const t = targetOf(col.key);
                    return (
                      <th key={col.key} className="px-4 py-3 font-medium" title={col.help}>
                        <div>{col.label}</div>
                        {t && (
                          <div className="font-normal normal-case text-fg-subtle">
                            target {t.higherIsBetter ? '≥' : '≤'} {col.format(t.target)}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${getAvatarColor(row.userId)}`}
                        >
                          {getInitials(row.name)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-fg">{row.name}</p>
                          <p className="text-[11px] text-fg-subtle">{row.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-fg-muted">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-fg">{row.counts.handled}</span>
                        {row.lowSample && (
                          <span title="Fewer than 5 tickets: read the percentages with care">
                            <Info className="h-3.5 w-3.5 text-warning" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-fg-subtle">
                        {row.counts.resolved} resolved · {row.counts.escalatedAway} escalated
                      </p>
                    </td>

                    {metricColumns.map((col) => {
                      const cell = row.metrics[col.key];
                      return (
                        <td key={col.key} className={`px-4 py-3 text-sm font-semibold ${cellTone(cell)}`}>
                          {cell.value === null ? '—' : col.format(cell.value)}
                        </td>
                      );
                    })}

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-fg">{row.score === null ? '—' : row.score}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${bandStyles[row.band].badge}`}
                        >
                          {bandStyles[row.band].label}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-fg-muted">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/30" />Target met</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-warning/30" />Within reach (score 60+)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-danger/30" />Needs attention</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-line" />No data</span>
            <span className="text-fg-subtle">Sorted by name on purpose: this is a matrix, not a leaderboard.</span>
          </div>

          <details className="card p-4 text-xs text-fg-muted">
            <summary className="cursor-pointer font-semibold text-fg">How are scores calculated?</summary>
            <p className="mt-2">
              Each metric scores 100 when the target is met, and proportionally less when it is missed. The overall
              score is the weighted average of the metrics that have data. People with no tickets in the period show
              “—”, not zero. Hover a column heading to see its exact formula.
            </p>
          </details>
        </>
      )}
    </div>
  );
}

