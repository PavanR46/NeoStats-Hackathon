export type MetricKey =
  | 'SLA_COMPLIANCE'
  | 'AVG_FIRST_RESPONSE_MINUTES'
  | 'AVG_RESOLUTION_HOURS'
  | 'ESCALATION_RATE'
  | 'REOPEN_RATE';

export interface MetricCell {
  value: number | null;
  target: number | null;
  score: number | null;
  met: boolean | null;
}

export interface PerformanceRow {
  userId: string;
  name: string;
  email: string;
  counts: { handled: number; resolved: number; escalatedAway: number };
  lowSample: boolean;
  metrics: Record<MetricKey, MetricCell>;
  score: number | null;
  band: 'GOOD' | 'WATCH' | 'AT_RISK' | 'NO_DATA';
}

export interface PerformanceTarget {
  metric: string;
  target: number;
  weight: number;
  higherIsBetter: boolean;
}

export interface PerformanceMatrix {
  period: { from: string; to: string };
  scope: 'ALL' | 'TEAM' | 'SELF';
  targets: PerformanceTarget[];
  rows: PerformanceRow[];
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const rest = Math.round(m % 60);
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

export const metricColumns: {
  key: MetricKey;
  label: string;
  help: string;
  format: (v: number) => string;
}[] = [
  {
    key: 'SLA_COMPLIANCE',
    label: 'SLA compliance',
    help: 'On-time resolutions ÷ (on-time + breached). A ticket escalated for an SLA breach counts as breached.',
    format: (v) => `${v}%`,
  },
  {
    key: 'AVG_FIRST_RESPONSE_MINUTES',
    label: 'First response',
    help: 'Average time from ticket creation to the first public reply.',
    format: formatMinutes,
  },
  {
    key: 'AVG_RESOLUTION_HOURS',
    label: 'Resolution time',
    help: 'Average time from creation to resolution, for tickets this person resolved.',
    format: (v) => `${v} h`,
  },
  {
    key: 'ESCALATION_RATE',
    label: 'Escalation rate',
    help: 'Tickets escalated away from this person ÷ tickets they handled.',
    format: (v) => `${v}%`,
  },
  {
    key: 'REOPEN_RATE',
    label: 'Reopen rate',
    help: 'Resolved tickets that were later reopened ÷ tickets resolved.',
    format: (v) => `${v}%`,
  },
];

// Heat colour: green = target met, amber = within reach (score >= 60), red = needs attention
export function cellTone(c: MetricCell): string {
  if (c.value === null || c.score === null) return 'bg-surface-2 text-fg-subtle';
  if (c.met) return 'bg-success/10 text-success';
  if (c.score >= 60) return 'bg-warning/10 text-warning';
  return 'bg-danger/10 text-danger';
}

export const bandStyles: Record<PerformanceRow['band'], { label: string; badge: string }> = {
  GOOD: { label: 'Good', badge: 'bg-success/10 text-success border-success/25' },
  WATCH: { label: 'Watch', badge: 'bg-warning/10 text-warning border-warning/25' },
  AT_RISK: { label: 'At risk', badge: 'bg-danger/10 text-danger border-danger/25' },
  NO_DATA: { label: 'No data', badge: 'bg-surface-2 text-fg-subtle border-line' },
};

