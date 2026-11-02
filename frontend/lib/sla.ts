export const ESCALATION_LEVELS: Record<number, string> = {
  1: 'L1 Agent',
  2: 'L2 Lead',
  3: 'L3 Admin',
};

export type SlaState = 'none' | 'ok' | 'warning' | 'breached' | 'met' | 'late';

export interface SlaInfo {
  state: SlaState;
  label: string;
  classes: string;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const TONE = {
  ok: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  breached: 'border-danger/25 bg-danger/10 text-danger',
  none: 'border-line bg-surface-2 text-fg-subtle',
};

// 95 min -> "1h 35m", 3 days 4 h -> "3d 4h"
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MINUTE) return '<1 min';
  if (abs < HOUR) return `${Math.floor(abs / MINUTE)} min`;
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.floor((abs % HOUR) / MINUTE);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / HOUR);
  return h ? `${d}d ${h}h` : `${d}d`;
}

interface SlaTask {
  status: string;
  createdAt: string;
  slaResolveDueAt?: string | null;
  resolvedAt?: string | null;
}

// Pure function: the caller passes "now", so the badge can re-render on a timer and tests stay simple
export function getSlaInfo(task: SlaTask, now: number): SlaInfo {
  if (!task.slaResolveDueAt) return { state: 'none', label: 'No SLA', classes: TONE.none };

  const finished = task.status === 'DONE' || task.status === 'CLOSED';
  if (finished && !task.resolvedAt) return { state: 'none', label: 'No SLA', classes: TONE.none };

  const due = new Date(task.slaResolveDueAt).getTime();

  if (task.resolvedAt) {
    const resolved = new Date(task.resolvedAt).getTime();
    return resolved <= due
      ? { state: 'met', label: 'Resolved on time', classes: TONE.ok }
      : { state: 'late', label: `Resolved ${formatDuration(resolved - due)} late`, classes: TONE.breached };
  }

  const left = due - now;
  if (left < 0) {
    return { state: 'breached', label: `Breached ${formatDuration(left)} ago`, classes: TONE.breached };
  }

  // "At risk" = the last 20% of the window, but never less than 15 min or more than 4 h
  const total = due - new Date(task.createdAt).getTime();
  const atRiskBelow = Math.min(Math.max(0.2 * total, 15 * MINUTE), 4 * HOUR);
  const atRisk = left <= atRiskBelow;

  return {
    state: atRisk ? 'warning' : 'ok',
    label: `${formatDuration(left)} left`,
    classes: atRisk ? TONE.warning : TONE.ok,
  };
}