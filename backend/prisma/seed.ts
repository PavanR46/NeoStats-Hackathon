import { PrismaClient, GlobalRole, ProjectRole, TaskStatus, TaskPriority, EscalationType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NeoStats Database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.kpiTarget.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@neostats.com',
      password: hashedPassword,
      name: 'System Admin',
      globalRole: GlobalRole.ADMIN,
      isActive: true,
    },
  });

  const pmUser = await prisma.user.create({
    data: {
      email: 'pm@neostats.com',
      password: hashedPassword,
      name: 'Project Manager Sarah',
      globalRole: GlobalRole.USER,
      isActive: true,
    },
  });

  const memberUser = await prisma.user.create({
    data: {
      email: 'member@neostats.com',
      password: hashedPassword,
      name: 'Dev Member Alex',
      globalRole: GlobalRole.USER,
      isActive: true,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@neostats.com',
      password: hashedPassword,
      name: 'Stakeholder Viewer John',
      globalRole: GlobalRole.USER,
      isActive: true,
    },
  });

  const agentPriya = await prisma.user.create({
    data: { 
      email: 'priya@neostats.com', 
      password: hashedPassword, 
      name: 'Agent Priya', 
      globalRole: GlobalRole.USER, 
      isActive: true 
    },
  });

  const agentRavi = await prisma.user.create({
    data: { 
      email: 'ravi@neostats.com', 
      password: hashedPassword, 
      name: 'Agent Ravi', 
      globalRole: GlobalRole.USER, 
      isActive: true 
    },
  });

  console.log('Users created successfully.');

  // 2. Create Projects
  const projectAlpha = await prisma.project.create({
    data: {
      name: 'E-Commerce Platform Redesign',
      description: 'Overhaul UI/UX and optimize database queries for high traffic.',
    },
  });

  const projectBeta = await prisma.project.create({
    data: {
      name: 'Mobile App Flutter Port',
      description: 'Port iOS native app to Flutter for cross-platform support.',
    },
  });

  const projectGamma = await prisma.project.create({
    data: {
      name: 'Cloud Migration & Security Audit',
      description: 'Migrate on-prem servers to AWS and achieve ISO27001 compliance.',
    },
  });

  console.log('Projects created successfully.');

  // 3. Assign Project Members
  await prisma.projectMember.createMany({
    data: [
      { projectId: projectAlpha.id, userId: agentPriya.id, role: ProjectRole.TEAM_MEMBER },
      { projectId: projectAlpha.id, userId: agentRavi.id, role: ProjectRole.TEAM_MEMBER },
      { projectId: projectAlpha.id, userId: pmUser.id, role: ProjectRole.PROJECT_MANAGER },
      { projectId: projectAlpha.id, userId: memberUser.id, role: ProjectRole.TEAM_MEMBER },
      { projectId: projectAlpha.id, userId: viewerUser.id, role: ProjectRole.VIEWER },

      { projectId: projectBeta.id, userId: pmUser.id, role: ProjectRole.PROJECT_MANAGER },
      { projectId: projectBeta.id, userId: memberUser.id, role: ProjectRole.TEAM_MEMBER },
      { projectId: projectBeta.id, userId: viewerUser.id, role: ProjectRole.VIEWER },

      { projectId: projectGamma.id, userId: pmUser.id, role: ProjectRole.PROJECT_MANAGER },
    ],
  });

  console.log('Project memberships created.');

  // 4. Create ~10 Tasks
  const tasksData = [
    {
      projectId: projectAlpha.id,
      title: 'Design Database Schema for Products',
      description: 'Create normalized Postgres tables for products, categories, and inventory.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      version: 1,
      createdById: pmUser.id,
      assigneeId: memberUser.id,
    },
    {
      projectId: projectAlpha.id,
      title: 'Implement JWT Authentication API',
      description: 'Secure auth endpoint using httpOnly cookies and bcrypt hashing.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      version: 1,
      createdById: pmUser.id,
      assigneeId: memberUser.id,
    },
    {
      projectId: projectAlpha.id,
      title: 'Setup Redis Caching for Product List',
      description: 'Cache catalog queries to reduce DB load under peak traffic.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      version: 1,
      createdById: pmUser.id,
      assigneeId: memberUser.id,
    },
    {
      projectId: projectAlpha.id,
      title: 'Stripe Payment Gateway Integration',
      description: 'Connect checkout API with Stripe Webhooks.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      version: 1,
      createdById: pmUser.id,
      assigneeId: memberUser.id,
    },
    {
      projectId: projectAlpha.id,
      title: 'User Profile Page UI Polish',
      description: 'Apply glassmorphism theme and reactive state updates.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      version: 1,
      createdById: pmUser.id,
      assigneeId: null,
    },
    {
      projectId: projectBeta.id,
      title: 'Configure Flutter Navigation Router',
      description: 'Set up GoRouter with dynamic deep linking.',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      version: 1,
      createdById: pmUser.id,
      assigneeId: memberUser.id,
    },
    {
      projectId: projectBeta.id,
      title: 'Push Notifications Integration',
      description: 'Configure Firebase Cloud Messaging (FCM) for iOS and Android.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      version: 1,
      createdById: pmUser.id,
      assigneeId: memberUser.id,
    },
    {
      projectId: projectBeta.id,
      title: 'Biometric Auth Support',
      description: 'Allow users to log in with FaceID / TouchID.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      version: 1,
      createdById: pmUser.id,
      assigneeId: null,
    },
    {
      projectId: projectGamma.id,
      title: 'AWS VPC & Subnet Setup',
      description: 'Establish public and private subnets across 3 Availability Zones.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      version: 1,
      createdById: adminUser.id,
      assigneeId: pmUser.id,
    },
    {
      projectId: projectGamma.id,
      title: 'Penetration Testing & Security Report',
      description: 'Conduct OWASP Top 10 security audit before launch.',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      version: 1,
      createdById: adminUser.id,
      assigneeId: null,
    },
  ];

  for (const t of tasksData) {
    const createdTask = await prisma.task.create({ data: t });

    // Add sample comment to first task
    if (t.title.includes('Database Schema')) {
      await prisma.comment.create({
        data: {
          taskId: createdTask.id,
          userId: memberUser.id,
          content: 'Initial schema draft submitted! Please review.',
        },
      });
    }
  }

  console.log('10 initial tasks created with sample comments.');

  // 4b. KPM: global SLA policies (minutes)
  const slaDefaults = [
    { priority: TaskPriority.URGENT, responseMinutes: 15, resolveMinutes: 240 },
    { priority: TaskPriority.HIGH, responseMinutes: 60, resolveMinutes: 480 },
    { priority: TaskPriority.MEDIUM, responseMinutes: 240, resolveMinutes: 1440 },
    { priority: TaskPriority.LOW, responseMinutes: 480, resolveMinutes: 4320 },
  ];
  await prisma.slaPolicy.createMany({ data: slaDefaults });

  // 4c. KPM: global KPI targets
  await prisma.kpiTarget.createMany({
    data: [
      { metric: 'SLA_COMPLIANCE', target: 90, weight: 3, higherIsBetter: true },
      { metric: 'AVG_RESOLUTION_HOURS', target: 24, weight: 2, higherIsBetter: false },
      { metric: 'AVG_FIRST_RESPONSE_MINUTES', target: 120, weight: 2, higherIsBetter: false },
      { metric: 'ESCALATION_RATE', target: 10, weight: 2, higherIsBetter: false },
      { metric: 'REOPEN_RATE', target: 5, weight: 1, higherIsBetter: false },
    ],
  });

  // 4d. KPM: historical resolved tickets for performance matrix demo
  const HOUR = 3600_000;
  const P = TaskPriority;
  const demoTickets = [
    { who: memberUser, p: P.HIGH, ago: 200, fr: 20, hrs: 5, esc: false, re: 0 },
    { who: memberUser, p: P.MEDIUM, ago: 180, fr: 45, hrs: 12, esc: false, re: 0 },
    { who: memberUser, p: P.URGENT, ago: 150, fr: 10, hrs: 3, esc: false, re: 0 },
    { who: memberUser, p: P.LOW, ago: 120, fr: 90, hrs: 30, esc: false, re: 0 },
    { who: agentPriya, p: P.HIGH, ago: 190, fr: 70, hrs: 9, esc: false, re: 0 },
    { who: agentPriya, p: P.MEDIUM, ago: 160, fr: 200, hrs: 30, esc: true, re: 0 },
    { who: agentPriya, p: P.URGENT, ago: 140, fr: 25, hrs: 6, esc: true, re: 1 },
    { who: agentPriya, p: P.LOW, ago: 100, fr: 300, hrs: 40, esc: false, re: 0 },
    { who: agentRavi, p: P.HIGH, ago: 170, fr: 150, hrs: 20, esc: true, re: 1 },
    { who: agentRavi, p: P.URGENT, ago: 130, fr: 60, hrs: 10, esc: true, re: 0 },
    { who: agentRavi, p: P.MEDIUM, ago: 110, fr: 400, hrs: 50, esc: true, re: 1 },
    { who: agentRavi, p: P.MEDIUM, ago: 90, fr: 120, hrs: 18, esc: false, re: 0 },
  ];

  let n = 1;
  for (const d of demoTickets) {
    const created = new Date(Date.now() - d.ago * HOUR);
    const sla = slaDefaults.find((s) => s.priority === d.p)!;
    const resolvedAt = new Date(created.getTime() + d.hrs * HOUR);
    const resolveDue = new Date(created.getTime() + sla.resolveMinutes * 60_000);
    const breached = resolvedAt.getTime() > resolveDue.getTime();

    const ticket = await prisma.task.create({
      data: {
        projectId: projectAlpha.id,
        title: `Customer issue #${n++}`,
        description: 'Historical ticket used for performance metrics demo.',
        status: TaskStatus.DONE,
        priority: d.p,
        createdById: pmUser.id,
        requesterId: viewerUser.id,
        assigneeId: d.who.id,
        createdAt: created,
        slaResponseDueAt: new Date(created.getTime() + sla.responseMinutes * 60_000),
        slaResolveDueAt: resolveDue,
        firstResponseAt: new Date(created.getTime() + d.fr * 60_000),
        resolvedAt,
        slaBreachedAt: breached ? resolveDue : null,
        escalationLevel: d.esc ? 2 : 1,
        reopenCount: d.re,
      },
    });

    if (d.esc) {
      await prisma.escalation.create({
        data: {
          taskId: ticket.id,
          fromLevel: 1,
          toLevel: 2,
          type: breached ? EscalationType.SLA_BREACH : EscalationType.MANUAL,
          reason: breached ? 'SLA resolution target breached' : 'Needs lead review',
          escalatedToId: pmUser.id,
          fromAssigneeId: d.who.id,
          createdAt: breached ? resolveDue : new Date(created.getTime() + HOUR),
        },
      });
    }
  }

  // 5. Create Initial Notifications & Activity Log
  await prisma.notification.create({
    data: {
      userId: memberUser.id,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: 'You were assigned to "Implement JWT Authentication API"',
      link: '/projects/' + projectAlpha.id + '/tasks',
    },
  });

  await prisma.activityLog.create({
    data: {
      userId: adminUser.id,
      projectId: projectAlpha.id,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: projectAlpha.id,
      metadata: { projectName: projectAlpha.name },
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });