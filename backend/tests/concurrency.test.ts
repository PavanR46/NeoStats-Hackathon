import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/db/prisma';
import bcrypt from 'bcrypt';

describe('Optimistic Concurrency & Permission Boundary Integration Tests', () => {
  let adminCookie: string;
  let pmCookie: string;
  let memberCookie: string;
  let testProjectId: string;
  let testTaskId: string;
  let memberUserId: string;

  beforeAll(async () => {
    // Clean database before testing
    await prisma.notification.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    const dbUrl = process.env.DATABASE_URL ?? '';
    if (!/(_test|ci_db)/.test(dbUrl)) {
      throw new Error('Refusing to wipe a non-test database.');
    }
    // Seed test users
    const admin = await prisma.user.create({
      data: {
        email: 'testadmin@neostats.com',
        password: hashedPassword,
        name: 'Test Admin',
        globalRole: 'ADMIN',
      },
    });

    const pm = await prisma.user.create({
      data: {
        email: 'testpm@neostats.com',
        password: hashedPassword,
        name: 'Test PM',
        globalRole: 'USER',
      },
    });

    const member = await prisma.user.create({
      data: {
        email: 'testmember@neostats.com',
        password: hashedPassword,
        name: 'Test Member',
        globalRole: 'USER',
      },
    });
    memberUserId = member.id;

    // Log in and capture auth cookies
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testadmin@neostats.com', password: 'password123' });
    adminCookie = adminRes.headers['set-cookie'][0];

    const pmRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testpm@neostats.com', password: 'password123' });
    pmCookie = pmRes.headers['set-cookie'][0];

    const memberRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testmember@neostats.com', password: 'password123' });
    memberCookie = memberRes.headers['set-cookie'][0];

    // Create test project (Admin action)
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookie)
      .send({ name: 'Concurrency Test Project', description: 'Testing 409 conflicts' });

    testProjectId = projectRes.body.project.id;

    // Add PM and Member to project
    await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: pm.id, role: 'PROJECT_MANAGER' });

    await request(app)
      .post(`/api/projects/${testProjectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: memberUserId, role: 'TEAM_MEMBER' });
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
});
