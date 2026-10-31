import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/db/prisma';
import bcrypt from 'bcrypt';
import { runSlaCheck } from '../src/jobs/sla.worker';

describe('Optimistic Concurrency & Permission Boundary Integration Tests', () => {
    let adminCookie: string;
  let pmCookie: string;
  let memberCookie: string;
  let viewerCookie: string;
  let testProjectId: string;
  let testTaskId: string;
  let memberUserId: string;
  let pmUserId: string;

  beforeAll(async () => {
    // SAFETY FIRST: this guard must run before anything is deleted
    const dbUrl = process.env.DATABASE_URL ?? '';
    if (!/(_test|ci_db)/.test(dbUrl)) {
      throw new Error('Refusing to wipe a non-test database.');
    }

    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.escalation.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.slaPolicy.deleteMany();
    await prisma.kpiTarget.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    // Global SLA policies so new tickets get due dates
    await prisma.slaPolicy.createMany({
      data: [
        { priority: 'URGENT', responseMinutes: 15, resolveMinutes: 240 },
        { priority: 'HIGH', responseMinutes: 60, resolveMinutes: 480 },
        { priority: 'MEDIUM', responseMinutes: 240, resolveMinutes: 1440 },
        { priority: 'LOW', responseMinutes: 480, resolveMinutes: 4320 },
      ],
    });

    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: { email: 'testadmin@neostats.com', password: hashedPassword, name: 'Test Admin', globalRole: 'ADMIN' },
    });
    const pm = await prisma.user.create({
      data: { email: 'testpm@neostats.com', password: hashedPassword, name: 'Test PM', globalRole: 'USER' },
    });
    const member = await prisma.user.create({
      data: { email: 'testmember@neostats.com', password: hashedPassword, name: 'Test Member', globalRole: 'USER' },
    });
    const viewer = await prisma.user.create({
      data: { email: 'testviewer@neostats.com', password: hashedPassword, name: 'Test Viewer', globalRole: 'USER' },
    });
    pmUserId = pm.id;
    memberUserId = member.id;

    const login = async (email: string) => {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
      return res.headers['set-cookie'][0];
    };
    adminCookie = await login('testadmin@neostats.com');
    pmCookie = await login('testpm@neostats.com');
    memberCookie = await login('testmember@neostats.com');
    viewerCookie = await login('testviewer@neostats.com');

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookie)
      .send({ name: 'Concurrency Test Project', description: 'Testing 409 conflicts' });
    testProjectId = projectRes.body.project.id;

    const addMember = (userId: string, role: string) =>
      request(app)
        .post(`/api/projects/${testProjectId}/members`)
        .set('Cookie', adminCookie)
        .send({ userId, role });
    await addMember(pm.id, 'PROJECT_MANAGER');
    await addMember(member.id, 'TEAM_MEMBER');
    await addMember(viewer.id, 'VIEWER');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Should create a task initialized with version = 1', async () => {
    const res = await request(app)
      .post(`/api/projects/${testProjectId}/tasks`)
      .set('Cookie', pmCookie)
      .send({
        title: 'Initial Concurrency Task',
        description: 'Testing version increment',
        priority: 'HIGH',
        status: 'TODO',
      });

    expect(res.status).toBe(201);
    expect(res.body.task.version).toBe(1);
    expect(res.body.task.title).toBe('Initial Concurrency Task');
    testTaskId = res.body.task.id;
  });

  it('2. Should successfully update task when providing current version = 1', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTaskId}`)
      .set('Cookie', pmCookie)
      .send({
        version: 1,
        title: 'Task Updated First Time',
        status: 'IN_PROGRESS',
      });

    expect(res.status).toBe(200);
    expect(res.body.task.version).toBe(2);
    expect(res.body.task.status).toBe('IN_PROGRESS');
  });

  it('3. SHOULD REJECT STALE UPDATE WITH HTTP 409 CONFLICT when sending version = 1 (current DB version is 2)', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTaskId}`)
      .set('Cookie', pmCookie)
      .send({
        version: 1, // Stale version!
        title: 'Stale Overwrite Attempt',
        status: 'DONE',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_CONFLICT');
    expect(res.body.error.message).toContain('modified by another user');
    expect(res.body.latestTask).toBeDefined();
    expect(res.body.latestTask.version).toBe(2);
    expect(res.body.latestTask.status).toBe('IN_PROGRESS');
  });

  it('4. Should reject unauthorized updates with HTTP 403 Forbidden', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTaskId}`)
      .set('Cookie', memberCookie)
      .send({
        version: 2,
        title: 'Unauthorized Member Edit',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Team Members can only update tasks assigned to them');
  });

  it('5. PM of project A must NOT modify a task that belongs to project B (nested URL)', async () => {
    const other = await request(app)
      .post('/api/projects').set('Cookie', adminCookie)
      .send({ name: 'Other Project' });
    const secret = await request(app)
      .post(`/api/projects/${other.body.project.id}/tasks`).set('Cookie', adminCookie)
      .send({ title: 'Secret task', priority: 'LOW', status: 'TODO' });

    const res = await request(app)
      .patch(`/api/projects/${testProjectId}/tasks/${secret.body.task.id}`)
      .set('Cookie', pmCookie)
      .send({ version: 1, title: 'hacked' });

    expect(res.status).toBe(404);
  });

  it('6. PM must NOT read activity of a project they are not in via ?projectId=', async () => {
    const otherProject = await prisma.project.findFirst({ where: { name: 'Other Project' } });
    const secretTask = await prisma.task.findFirst({ where: { title: 'Secret task' } });

    if (!otherProject || !secretTask) {
      throw new Error('Setup prerequisite missing for test 6');
    }

    const res = await request(app)
      .get(`/api/activity?projectId=${otherProject.id}`)
      .set('Cookie', pmCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.some((a: any) => a.entityId === secretTask.id)).toBe(false);
  });

  it('7. Listing tasks without a project in the URL must be rejected (no body trick)', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', memberCookie)
      .send({ projectId: testProjectId });

    expect(res.status).toBe(400);
  });

  it('8. PM can comment on a task via /api/tasks/:id/comments', async () => {
    const res = await request(app)
      .post(`/api/tasks/${testTaskId}/comments`)
      .set('Cookie', pmCookie)
      .send({ content: 'Looking into it' });

    expect(res.status).toBe(201);
  });
    const mkTicket = async (body: Record<string, unknown> = {}) => {
    const res = await request(app)
      .post(`/api/projects/${testProjectId}/tasks`)
      .set('Cookie', pmCookie)
      .send({ title: 'KPM test ticket', priority: 'HIGH', ...body });
    expect(res.status).toBe(201);
    return res.body.task;
  };

  it('9. New ticket gets SLA due dates from its priority', async () => {
    const t = await mkTicket({ priority: 'HIGH' });
    const minutes = (new Date(t.slaResolveDueAt).getTime() - new Date(t.createdAt).getTime()) / 60000;
    expect(Math.round(minutes)).toBe(480);
    expect(t.ticketNumber).toBeGreaterThan(0);
  });

  it('10. Only a PUBLIC reply from someone other than the requester sets firstResponseAt', async () => {
    const t = await mkTicket({ requesterId: memberUserId });
    const getTicket = async () =>
      (await request(app).get(`/api/tasks/${t.id}`).set('Cookie', pmCookie)).body.task;

    await request(app)
      .post(`/api/tasks/${t.id}/comments`).set('Cookie', pmCookie)
      .send({ content: 'private note', isInternal: true });
    expect((await getTicket()).firstResponseAt).toBeNull();

    await request(app)
      .post(`/api/tasks/${t.id}/comments`).set('Cookie', pmCookie)
      .send({ content: 'We are on it' });
    expect((await getTicket()).firstResponseAt).not.toBeNull();
  });

  it('11. Resolve sets resolvedAt; reopen clears it and bumps reopenCount', async () => {
    const t = await mkTicket();
    const done = await request(app)
      .patch(`/api/tasks/${t.id}/status`).set('Cookie', pmCookie)
      .send({ version: t.version, status: 'DONE' });
    expect(done.status).toBe(200);
    expect(done.body.task.resolvedAt).not.toBeNull();

    const reopened = await request(app)
      .patch(`/api/tasks/${t.id}/status`).set('Cookie', pmCookie)
      .send({ version: done.body.task.version, status: 'TODO' });
    expect(reopened.status).toBe(200);
    expect(reopened.body.task.resolvedAt).toBeNull();
    expect(reopened.body.task.reopenCount).toBe(1);
  });

  it('12. Team Member cannot reassign, reprioritise or close a ticket', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });

    const reassign = await request(app)
      .patch(`/api/tasks/${t.id}`).set('Cookie', memberCookie)
      .send({ version: t.version, assigneeId: pmUserId });
    expect(reassign.status).toBe(403);

    const reprioritise = await request(app)
      .patch(`/api/tasks/${t.id}`).set('Cookie', memberCookie)
      .send({ version: t.version, priority: 'LOW' });
    expect(reprioritise.status).toBe(403);

    const close = await request(app)
      .patch(`/api/tasks/${t.id}/status`).set('Cookie', memberCookie)
      .send({ version: t.version, status: 'CLOSED' });
    expect(close.status).toBe(403);
  });

  it('13. A ticket cannot be escalated by simply setting its status', async () => {
    const t = await mkTicket();
    const res = await request(app)
      .patch(`/api/tasks/${t.id}/status`).set('Cookie', pmCookie)
      .send({ version: t.version, status: 'ESCALATED' });
    expect(res.status).toBe(400);
  });

  it('14. Viewers never see internal notes', async () => {
    const t = await mkTicket();
    await request(app)
      .post(`/api/tasks/${t.id}/comments`).set('Cookie', pmCookie)
      .send({ content: 'internal only', isInternal: true });
    await request(app)
      .post(`/api/tasks/${t.id}/comments`).set('Cookie', pmCookie)
      .send({ content: 'public reply' });

    const asViewer = await request(app).get(`/api/tasks/${t.id}/comments`).set('Cookie', viewerCookie);
    expect(asViewer.status).toBe(200);
    expect(asViewer.body.data.map((c: any) => c.content)).toEqual(['public reply']);

    const asPm = await request(app).get(`/api/tasks/${t.id}/comments`).set('Cookie', pmCookie);
    expect(asPm.body.data).toHaveLength(2);
  });

  it('15. Viewers cannot be assigned tickets', async () => {
    const viewer = await prisma.user.findUnique({ where: { email: 'testviewer@neostats.com' } });
    const res = await request(app)
      .post(`/api/projects/${testProjectId}/tasks`).set('Cookie', pmCookie)
      .send({ title: 'Bad assignment', assigneeId: viewer!.id });
    expect(res.status).toBe(400);
  });
    it('16. PM CAN assign, reprioritise and close a ticket (the allowed path)', async () => {
    const t = await mkTicket();
    const assign = await request(app)
      .patch(`/api/tasks/${t.id}`).set('Cookie', pmCookie)
      .send({ version: t.version, assigneeId: memberUserId, priority: 'URGENT' });
    expect(assign.status).toBe(200);
    expect(assign.body.task.assigneeId).toBe(memberUserId);
    expect(assign.body.task.priority).toBe('URGENT');

    const closed = await request(app)
      .patch(`/api/tasks/${t.id}/status`).set('Cookie', pmCookie)
      .send({ version: assign.body.task.version, status: 'CLOSED' });
    expect(closed.status).toBe(200);
    expect(closed.body.task.closedAt).not.toBeNull();
  });

  it('17. Changing priority recalculates the SLA deadline', async () => {
    const t = await mkTicket({ priority: 'LOW' }); // 4320 min
    const res = await request(app)
      .patch(`/api/tasks/${t.id}`).set('Cookie', pmCookie)
      .send({ version: t.version, priority: 'URGENT' }); // 240 min
    const minutes =
      (new Date(res.body.task.slaResolveDueAt).getTime() - new Date(res.body.task.createdAt).getTime()) / 60000;
    expect(Math.round(minutes)).toBe(240);
  });
    it('18. Assigned agent escalates manually: level 2, ESCALATED, moved to the PM, history kept', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });
    const res = await request(app)
      .post(`/api/tasks/${t.id}/escalate`).set('Cookie', memberCookie)
      .send({ version: t.version, reason: 'Customer is waiting, need lead help' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('ESCALATED');
    expect(res.body.task.escalationLevel).toBe(2);
    expect(res.body.task.assigneeId).toBe(pmUserId);

    const history = await request(app).get(`/api/tasks/${t.id}/escalations`).set('Cookie', pmCookie);
    expect(history.status).toBe(200);
    expect(history.body.escalations).toHaveLength(1);
    expect(history.body.escalations[0].type).toBe('MANUAL');
    expect(history.body.escalations[0].fromAssigneeId).toBe(memberUserId);
  });

  it('19. Escalation requires a real reason', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });
    const res = await request(app)
      .post(`/api/tasks/${t.id}/escalate`).set('Cookie', memberCookie)
      .send({ version: t.version, reason: 'no' });
    expect(res.status).toBe(400);
  });

  it('20. Viewers and members who do not own the ticket cannot escalate', async () => {
    const t = await mkTicket(); // unassigned
    const body = { version: t.version, reason: 'Trying to escalate this' };

    const asViewer = await request(app).post(`/api/tasks/${t.id}/escalate`).set('Cookie', viewerCookie).send(body);
    expect(asViewer.status).toBe(403);

    const asMember = await request(app).post(`/api/tasks/${t.id}/escalate`).set('Cookie', memberCookie).send(body);
    expect(asMember.status).toBe(403);
  });

  it('21. Escalating with a stale version returns 409', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });
    await request(app)
      .patch(`/api/tasks/${t.id}`).set('Cookie', pmCookie)
      .send({ version: t.version, title: 'Edited meanwhile' });

    const res = await request(app)
      .post(`/api/tasks/${t.id}/escalate`).set('Cookie', memberCookie)
      .send({ version: t.version, reason: 'Need help from the lead' });
    expect(res.status).toBe(409);
  });

  it('22. A ticket can be escalated at most to level 3', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });
    const first = await request(app)
      .post(`/api/tasks/${t.id}/escalate`).set('Cookie', memberCookie)
      .send({ version: t.version, reason: 'Needs lead attention' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/tasks/${t.id}/escalate`).set('Cookie', pmCookie)
      .send({ version: first.body.task.version, reason: 'Needs an admin decision' });
    expect(second.status).toBe(200);
    expect(second.body.task.escalationLevel).toBe(3);

    const third = await request(app)
      .post(`/api/tasks/${t.id}/escalate`).set('Cookie', pmCookie)
      .send({ version: second.body.task.version, reason: 'One more try' });
    expect(third.status).toBe(400);
  });

  it('23. SLA worker escalates an overdue ticket exactly once', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });
    await prisma.task.update({
      where: { id: t.id },
      data: { slaResolveDueAt: new Date(Date.now() - 60_000) },
    });

    const first = await runSlaCheck();
    expect(first.escalated).toBeGreaterThanOrEqual(1);

    const after = await prisma.task.findUnique({ where: { id: t.id } });
    expect(after!.status).toBe('ESCALATED');
    expect(after!.escalationLevel).toBe(2);

    const rows = await prisma.escalation.findMany({ where: { taskId: t.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe('SLA_BREACH');
    expect(rows[0].escalatedById).toBeNull(); // done by the system
    expect(rows[0].fromAssigneeId).toBe(memberUserId);

    await runSlaCheck(); // second pass must not escalate it again
    expect(await prisma.escalation.count({ where: { taskId: t.id } })).toBe(1);
  });

  it('24. At the highest level the worker only flags the breach (no new escalation)', async () => {
    const t = await mkTicket({ assigneeId: memberUserId });
    await prisma.task.update({
      where: { id: t.id },
      data: { escalationLevel: 3, slaResolveDueAt: new Date(Date.now() - 60_000) },
    });

    const r = await runSlaCheck();
    expect(r.markedOnly).toBeGreaterThanOrEqual(1);

    const after = await prisma.task.findUnique({ where: { id: t.id } });
    expect(after!.slaBreachedAt).not.toBeNull();
    expect(await prisma.escalation.count({ where: { taskId: t.id } })).toBe(0);
  });
    it('25. Matrix computes the expected numbers for an isolated agent (admin view)', async () => {
    // A brand-new agent, so tickets from earlier tests cannot pollute the numbers
    const hash = await bcrypt.hash('password123', 10);
    const agent = await prisma.user.create({
      data: { email: 'perfagent@neostats.com', password: hash, name: 'Perf Agent', globalRole: 'USER' },
    });
    await prisma.projectMember.create({
      data: { projectId: testProjectId, userId: agent.id, role: 'TEAM_MEMBER' },
    });
    await prisma.kpiTarget.createMany({
      data: [
        { metric: 'SLA_COMPLIANCE', target: 90, weight: 3, higherIsBetter: true },
        { metric: 'AVG_RESOLUTION_HOURS', target: 24, weight: 2, higherIsBetter: false },
        { metric: 'AVG_FIRST_RESPONSE_MINUTES', target: 120, weight: 2, higherIsBetter: false },
        { metric: 'ESCALATION_RATE', target: 10, weight: 2, higherIsBetter: false },
        { metric: 'REOPEN_RATE', target: 5, weight: 1, higherIsBetter: false },
      ],
    });

    const H = 3_600_000;
    const MIN = 60_000;
    const mk = (hoursAgo: number, priority: any, frMin: number, resolveHrs: number, dueHrs: number, extra: any = {}) => {
      const created = new Date(Date.now() - hoursAgo * H);
      return prisma.task.create({
        data: {
          projectId: testProjectId,
          title: 'Perf ticket',
          priority,
          status: 'DONE',
          createdById: pmUserId,
          assigneeId: agent.id,
          createdAt: created,
          firstResponseAt: new Date(created.getTime() + frMin * MIN),
          resolvedAt: new Date(created.getTime() + resolveHrs * H),
          slaResolveDueAt: new Date(created.getTime() + dueHrs * H),
          ...extra,
        },
      });
    };

    await mk(10, 'HIGH', 30, 5, 8); // resolved in 5h, due 8h: on time
    const late = await mk(20, 'URGENT', 60, 10, 4, { reopenCount: 1 }); // resolved in 10h, due 4h: late, reopened
    await prisma.escalation.create({
      data: {
        taskId: late.id,
        fromLevel: 1,
        toLevel: 2,
        type: 'SLA_BREACH',
        reason: 'SLA breached',
        fromAssigneeId: agent.id,
        escalatedToId: pmUserId,
      },
    });

    const res = await request(app).get('/api/performance/matrix').set('Cookie', adminCookie);
    expect(res.status).toBe(200);

    const row = res.body.rows.find((r: any) => r.userId === agent.id);
    expect(row.counts).toEqual({ handled: 2, resolved: 2, escalatedAway: 1 });
    expect(row.lowSample).toBe(true);
    expect(row.metrics.SLA_COMPLIANCE.value).toBeCloseTo(50, 1);
    expect(row.metrics.AVG_FIRST_RESPONSE_MINUTES.value).toBeCloseTo(45, 1);
    expect(row.metrics.AVG_RESOLUTION_HOURS.value).toBeCloseTo(7.5, 1);
    expect(row.metrics.ESCALATION_RATE.value).toBeCloseTo(50, 1);
    expect(row.metrics.REOPEN_RATE.value).toBeCloseTo(50, 1);
    expect(row.score).toBeCloseTo(61.7, 0);
  });

  it('26. Anonymous users are rejected; members and viewers only ever see their own row', async () => {
    const anon = await request(app).get('/api/performance/matrix');
    expect(anon.status).toBe(401);

    const asMember = await request(app).get('/api/performance/matrix').set('Cookie', memberCookie);
    expect(asMember.status).toBe(200);
    expect(asMember.body.scope).toBe('SELF');
    expect(asMember.body.rows).toHaveLength(1);
    expect(asMember.body.rows[0].userId).toBe(memberUserId);

    const asViewer = await request(app).get('/api/performance/matrix').set('Cookie', viewerCookie);
    expect(asViewer.body.rows).toHaveLength(1);
  });

  it('27. A PM sees the people in their teams, and asking for another team is 403', async () => {
    const ok = await request(app).get('/api/performance/matrix').set('Cookie', pmCookie);
    expect(ok.status).toBe(200);
    expect(ok.body.scope).toBe('TEAM');
    expect(ok.body.rows.some((r: any) => r.userId === memberUserId)).toBe(true);

    const other = await request(app)
      .post('/api/projects').set('Cookie', adminCookie)
      .send({ name: 'Perf Other Team' });
    const denied = await request(app)
      .get(`/api/performance/matrix?projectId=${other.body.project.id}`)
      .set('Cookie', pmCookie);
    expect(denied.status).toBe(403);
  });
});
