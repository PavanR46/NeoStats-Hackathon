import { EscalationType, TaskStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { ConflictError } from '../middlewares/error.middleware';
import { escalateTicket, MAX_ESCALATION_LEVEL } from '../services/escalation.service';
import { createNotification } from '../services/notification.service';
import { sendToUser } from '../socket';

const INTERVAL_MS = 60_000;
let running = false;

// One pass: find open tickets whose resolve deadline has passed and escalate each one level.
// Exported with an injectable "now" so tests can call it directly, without timers.
export async function runSlaCheck(now: Date = new Date()) {
  const overdue = await prisma.task.findMany({
    where: {
      status: { notIn: [TaskStatus.DONE, TaskStatus.CLOSED] },
      slaResolveDueAt: { lt: now },
      slaBreachedAt: null,
      project: { isArchived: false },
    },
    orderBy: { slaResolveDueAt: 'asc' },
    take: 50,
    select: {
      id: true,
      version: true,
      escalationLevel: true,
      ticketNumber: true,
      title: true,
      assigneeId: true,
      projectId: true,
    },
  });

  let escalated = 0;
  let markedOnly = 0;

  for (const t of overdue) {
    try {
      if (t.escalationLevel >= MAX_ESCALATION_LEVEL) {
        // Nobody left to escalate to: record the breach once so it isn't re-checked every minute.
        // The version is NOT bumped on purpose, so this never causes a false 409 for an editor.
        const r = await prisma.task.updateMany({
          where: { id: t.id, version: t.version, slaBreachedAt: null },
          data: { slaBreachedAt: now },
        });
        if (r.count === 1) {
          markedOnly++;
          if (t.assigneeId) {
            const n = await createNotification({
              userId: t.assigneeId,
              type: 'SLA_BREACHED',
              title: 'SLA breached',
              message: `Ticket #${t.ticketNumber} "${t.title}" breached its SLA at the highest escalation level.`,
              link: `/projects/${t.projectId}/tasks`,
            });
            if (n) sendToUser(n.userId, 'notification:new', n);
          }
        }
        continue;
      }

      await escalateTicket({
        taskId: t.id,
        type: EscalationType.SLA_BREACH,
        reason: 'SLA resolution deadline was missed',
        expectedVersion: t.version,
      });
      escalated++;
    } catch (err) {
      if (err instanceof ConflictError) continue; // a human changed it meanwhile: retry next pass
      console.error(`[SLA worker] failed for ticket ${t.id}:`, err);
    }
  }

  return { checked: overdue.length, escalated, markedOnly };
}

export function startSlaWorker() {
  const timer = setInterval(async () => {
    if (running) return; // never let two passes overlap
    running = true;
    try {
      const r = await runSlaCheck();
      if (r.escalated || r.markedOnly) {
        console.log(`[SLA worker] escalated ${r.escalated}, flagged ${r.markedOnly}`);
      }
    } catch (err) {
      console.error('[SLA worker] pass failed:', err);
    } finally {
      running = false;
    }
  }, INTERVAL_MS);

  timer.unref();
  console.log('[SLA worker] started (checks every 60s)');
  return timer;
}