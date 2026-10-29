import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/db/prisma';
import bcrypt from 'bcrypt';

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
});
