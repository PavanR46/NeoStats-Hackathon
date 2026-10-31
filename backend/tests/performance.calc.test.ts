import { describe, it, expect } from 'vitest';
import {
  bandFor,
  compositeScore,
  computeAgentMetrics,
  DEFAULT_TARGETS,
  MetricKey,
  MetricResult,
  scoreMetric,
} from '../src/services/performance.calc';

const H = 3_600_000;
const M = 60_000;
const t0 = new Date('2026-10-01T00:00:00Z');
const at = (ms: number) => new Date(t0.getTime() + ms);

// opened at t0; first response after `fr` minutes; resolved after `hrs` hours; SLA due after `dueHrs` hours
const resolved = (id: string, fr: number, hrs: number, dueHrs: number, reopenCount = 0) => ({
  id,
  createdAt: t0,
  firstResponseAt: at(fr * M),
  resolvedAt: at(hrs * H),
  slaResolveDueAt: at(dueHrs * H),
  reopenCount,
});
const escalatedBreach = (id: string, fr: number) => ({
  id,
  createdAt: t0,
  firstResponseAt: at(fr * M),
  type: 'SLA_BREACH' as const,
});

describe('performance math', () => {
  // Priya from the seed: 4 tickets, 2 of them escalated for SLA breach, 1 reopened
  const priya = computeAgentMetrics(
    [resolved('p1', 70, 9, 8), resolved('p2', 200, 30, 24), resolved('p3', 25, 6, 4, 1), resolved('p4', 300, 40, 72)],
    [escalatedBreach('p2', 200), escalatedBreach('p3', 25)]
  );

  it("computes Priya's raw metrics (hand-calculated)", () => {
    expect(priya.counts).toEqual({ handled: 4, resolved: 4, escalatedAway: 2 });
    expect(priya.values.SLA_COMPLIANCE).toBeCloseTo(25, 5); // only p4 on time; p1,p2,p3 breached
    expect(priya.values.AVG_FIRST_RESPONSE_MINUTES).toBeCloseTo(148.75, 5);
    expect(priya.values.AVG_RESOLUTION_HOURS).toBeCloseTo(21.25, 5);
    expect(priya.values.ESCALATION_RATE).toBeCloseTo(50, 5);
    expect(priya.values.REOPEN_RATE).toBeCloseTo(25, 5);
  });

  it('scores against the default targets and combines with weights', () => {
    const results: Record<string, MetricResult> = {};
    for (const t of DEFAULT_TARGETS) results[t.metric] = scoreMetric(priya.values[t.metric as MetricKey], t);

    expect(results.SLA_COMPLIANCE.score).toBeCloseTo(27.8, 1); // 25 / 90
    expect(results.AVG_RESOLUTION_HOURS.score).toBe(100); // 21.25h is within the 24h target
    expect(results.AVG_FIRST_RESPONSE_MINUTES.score).toBeCloseTo(80.7, 1); // 120 / 148.75
    expect(compositeScore(results, DEFAULT_TARGETS)).toBeCloseTo(50.5, 0);
  });

  it('counts a ticket that was both late and SLA-escalated only once', () => {
    const r = computeAgentMetrics([resolved('x', 10, 10, 4)], [escalatedBreach('x', 10)]);
    expect(r.counts.handled).toBe(1);
    expect(r.values.SLA_COMPLIANCE).toBe(0); // one breached ticket out of one, not "two breaches"
  });

  it('returns nulls, not zeros, when there is no data', () => {
    const r = computeAgentMetrics([], []);
    expect(r.counts.handled).toBe(0);
    Object.values(r.values).forEach((v) => expect(v).toBeNull());
    expect(bandFor(compositeScore({}, DEFAULT_TARGETS))).toBe('NO_DATA');
  });

  it('gives full marks when a lower-is-better metric is zero', () => {
    const target = DEFAULT_TARGETS.find((t) => t.metric === 'ESCALATION_RATE')!;
    expect(scoreMetric(0, target).score).toBe(100);
  });
});