import { Prisma, ProjectRole } from '@prisma/client';
import { prisma } from '../db/prisma';
import { AppError } from '../middlewares/error.middleware';
import { PerformanceQuery } from '../schemas/performance.schema';
import {
  bandFor,
  compositeScore,
  computeAgentMetrics,
  DEFAULT_TARGETS,
  METRIC_KEYS,
  MetricResult,
  scoreMetric,
  Target,
} from './performance.calc';

const DAY = 24 * 3_600_000;
const LOW_SAMPLE_BELOW = 5;

export async function getPerformanceMatrix(
  actor: { id: string; globalRole: string },
  query: PerformanceQuery
) {
  const to = query.to ?? new Date();
  const from = query.from ?? new Date(to.getTime() - 30 * DAY);
  if (from.getTime() >= to.getTime()) {
    throw new AppError('"from" must be before "to".', 400);
  }
  if (to.getTime() - from.getTime() > 366 * DAY) {
    throw new AppError('The period cannot be longer than 366 days.', 400);
  }

  // ---- Who is asking, and what may they see? (decided here, never by the client) ----
  const isAdmin = actor.globalRole === 'ADMIN';
  const managed = isAdmin
    ? []
    : await prisma.projectMember.findMany({
        where: { userId: actor.id, role: ProjectRole.PROJECT_MANAGER },
        select: { projectId: true },
      });
  const managedIds = managed.map((m) => m.projectId);
  const scope: 'ALL' | 'TEAM' | 'SELF' = isAdmin ? 'ALL' : managedIds.length > 0 ? 'TEAM' : 'SELF';

  let projectIds: string[] | null = null; // null = no project filter
  if (query.projectId) {
    if (scope === 'ALL') {
      const exists = await prisma.project.findUnique({ where: { id: query.projectId }, select: { id: true } });
      if (!exists) throw new AppError('Project not found.', 404);
    } else if (scope === 'TEAM' && !managedIds.includes(query.projectId)) {
      throw new AppError('You can only view performance for teams you manage.', 403);
    }
    projectIds = [query.projectId]; // for SELF this only narrows their own tickets
  } else if (scope === 'TEAM') {
    projectIds = managedIds;
  }

  // ---- The people in scope ----
  let users: { id: string; name: string; email: string }[];
  if (scope === 'SELF') {
    const me = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, name: true, email: true },
    });
    users = me ? [me] : [];
  } else {
    const members = await prisma.projectMember.findMany({
      where: {
        ...(projectIds ? { projectId: { in: projectIds } } : {}),
        role: { not: ProjectRole.VIEWER },
        user: { isActive: true },
      },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
    users = Array.from(new Map(members.map((m) => [m.user.id, m.user] as const)).values());
  }
  users.sort((a, b) => a.name.localeCompare(b.name)); // by name on purpose: a matrix, not a leaderboard
  const userIds = users.map((u) => u.id);

  // ---- The data ----
  const ticketScope: Prisma.TaskWhereInput = projectIds ? { projectId: { in: projectIds } } : {};

  const [resolvedRows, escalationRows, targetRows] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: { in: userIds }, resolvedAt: { gte: from, lte: to }, ...ticketScope },
      select: {
        id: true,
        assigneeId: true,
        createdAt: true,
        firstResponseAt: true,
        resolvedAt: true,
        slaResolveDueAt: true,
        reopenCount: true,
      },
    }),
    prisma.escalation.findMany({
      where: { fromAssigneeId: { in: userIds }, createdAt: { gte: from, lte: to }, task: ticketScope },
      select: {
        fromAssigneeId: true,
        type: true,
        task: { select: { id: true, createdAt: true, firstResponseAt: true } },
      },
    }),
    prisma.kpiTarget.findMany({
      where: { OR: [{ projectId: null }, ...(projectIds ? [{ projectId: { in: projectIds } }] : [])] },
    }),
  ]);

  // Targets: global ones, overridden by the team's own when exactly one team is selected
  const byMetric = new Map<string, Target>();
  targetRows.filter((t) => t.projectId === null).forEach((t) => byMetric.set(t.metric, t));
  if (projectIds && projectIds.length === 1) {
    targetRows.filter((t) => t.projectId === projectIds![0]).forEach((t) => byMetric.set(t.metric, t));
  }
  const targets: Target[] = byMetric.size ? Array.from(byMetric.values()) : DEFAULT_TARGETS;
  const targetFor = new Map(targets.map((t) => [t.metric, t] as const));

  // ---- One row per person ----
  const rows = users.map((u) => {
    const mine = resolvedRows
      .filter((t) => t.assigneeId === u.id)
      .map((t) => ({
        id: t.id,
        createdAt: t.createdAt,
        firstResponseAt: t.firstResponseAt,
        resolvedAt: t.resolvedAt!,
        slaResolveDueAt: t.slaResolveDueAt,
        reopenCount: t.reopenCount,
      }));
    const left = escalationRows
      .filter((e) => e.fromAssigneeId === u.id)
      .map((e) => ({
        id: e.task.id,
        createdAt: e.task.createdAt,
        firstResponseAt: e.task.firstResponseAt,
        type: e.type,
      }));

    const { counts, values } = computeAgentMetrics(mine, left);

    const metrics: Record<string, MetricResult> = {};
    for (const key of METRIC_KEYS) metrics[key] = scoreMetric(values[key], targetFor.get(key));

    const score = compositeScore(metrics, targets);
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      counts,
      lowSample: counts.handled < LOW_SAMPLE_BELOW,
      metrics,
      score,
      band: bandFor(score),
    };
  });

  return { period: { from, to }, scope, targets, rows };
}