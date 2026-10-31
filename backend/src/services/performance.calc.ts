export type MetricKey =
  | 'SLA_COMPLIANCE'
  | 'AVG_FIRST_RESPONSE_MINUTES'
  | 'AVG_RESOLUTION_HOURS'
  | 'ESCALATION_RATE'
  | 'REOPEN_RATE';

export const METRIC_KEYS: MetricKey[] = [
  'SLA_COMPLIANCE',
  'AVG_FIRST_RESPONSE_MINUTES',
  'AVG_RESOLUTION_HOURS',
  'ESCALATION_RATE',
  'REOPEN_RATE',
];

export interface Target {
  metric: string;
  target: number;
  weight: number;
  higherIsBetter: boolean;
}

// Used when the database has no KPI targets at all
export const DEFAULT_TARGETS: Target[] = [
  { metric: 'SLA_COMPLIANCE', target: 90, weight: 3, higherIsBetter: true },
  { metric: 'AVG_RESOLUTION_HOURS', target: 24, weight: 2, higherIsBetter: false },
  { metric: 'AVG_FIRST_RESPONSE_MINUTES', target: 120, weight: 2, higherIsBetter: false },
  { metric: 'ESCALATION_RATE', target: 10, weight: 2, higherIsBetter: false },
  { metric: 'REOPEN_RATE', target: 5, weight: 1, higherIsBetter: false },
];

// A ticket the agent resolved
export interface ResolvedTicket {
  id: string;
  createdAt: Date;
  firstResponseAt: Date | null;
  resolvedAt: Date;
  slaResolveDueAt: Date | null;
  reopenCount: number;
}

// A ticket that LEFT the agent through an escalation
export interface EscalatedTicket {
  id: string;
  createdAt: Date;
  firstResponseAt: Date | null;
  type: 'MANUAL' | 'SLA_BREACH';
}

export interface MetricResult {
  value: number | null;
  target: number | null;
  score: number | null; // 0-100
  met: boolean | null;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeAgentMetrics(resolved: ResolvedTicket[], escalated: EscalatedTicket[]) {
  // Tickets the agent handled = resolved by them + escalated away from them (counted once each)
  const handled = new Map<string, { createdAt: Date; firstResponseAt: Date | null }>();
  resolved.forEach((t) => handled.set(t.id, t));
  escalated.forEach((e) => {
    if (!handled.has(e.id)) handled.set(e.id, e);
  });

  // SLA: a ticket is breached if it was resolved late OR escalated because of a breach. Counted once.
  const onTime = new Set<string>();
  const breached = new Set<string>();
  for (const t of resolved) {
    if (!t.slaResolveDueAt) continue; // no SLA, so not judged
    (t.resolvedAt.getTime() > t.slaResolveDueAt.getTime() ? breached : onTime).add(t.id);
  }
  for (const e of escalated) {
    if (e.type === 'SLA_BREACH') {
      breached.add(e.id);
      onTime.delete(e.id);
    }
  }
  const judged = onTime.size + breached.size;
  const escalatedIds = new Set(escalated.map((e) => e.id));

  const firstResponseMinutes = Array.from(handled.values())
    .filter((t) => t.firstResponseAt)
    .map((t) => (t.firstResponseAt!.getTime() - t.createdAt.getTime()) / MINUTE);
  const resolutionHours = resolved.map((t) => (t.resolvedAt.getTime() - t.createdAt.getTime()) / HOUR);

  const values: Record<MetricKey, number | null> = {
    SLA_COMPLIANCE: judged ? (onTime.size / judged) * 100 : null,
    AVG_FIRST_RESPONSE_MINUTES: avg(firstResponseMinutes),
    AVG_RESOLUTION_HOURS: avg(resolutionHours),
    ESCALATION_RATE: handled.size ? (escalatedIds.size / handled.size) * 100 : null,
    REOPEN_RATE: resolved.length
      ? (resolved.filter((t) => t.reopenCount > 0).length / resolved.length) * 100
      : null,
  };

  return {
    counts: { handled: handled.size, resolved: resolved.length, escalatedAway: escalatedIds.size },
    values,
  };
}

// 100 if the target is met, otherwise proportionally lower (never below 0)
export function scoreMetric(value: number | null, t: Target | undefined): MetricResult {
  if (!t) return { value: value === null ? null : round1(value), target: null, score: null, met: null };
  if (value === null) return { value: null, target: t.target, score: null, met: null };

  const met = t.higherIsBetter ? value >= t.target : value <= t.target;
  let score = 100;
  if (!met) {
    score = t.higherIsBetter ? (value / t.target) * 100 : (t.target / value) * 100;
  }
  score = Math.max(0, Math.min(100, score));

  return { value: round1(value), target: t.target, score: round1(score), met };
}

// Weighted average over the metrics that actually have data
export function compositeScore(results: Record<string, MetricResult>, targets: Target[]): number | null {
  let sum = 0;
  let weights = 0;
  for (const t of targets) {
    const r = results[t.metric];
    if (r && r.score !== null) {
      sum += r.score * t.weight;
      weights += t.weight;
    }
  }
  return weights ? round1(sum / weights) : null;
}

export function bandFor(score: number | null): 'GOOD' | 'WATCH' | 'AT_RISK' | 'NO_DATA' {
  if (score === null) return 'NO_DATA';
  if (score >= 90) return 'GOOD';
  if (score >= 60) return 'WATCH';
  return 'AT_RISK';
}