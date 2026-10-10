import { PrismaClient, GlobalRole, ProjectRole, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NeoStats Database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
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
