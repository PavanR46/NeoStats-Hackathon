import { prisma } from '../db/prisma';
import { CreateProjectInput, UpdateProjectInput, GetProjectsQuery } from '../schemas/project.schema';
import { recordActivity } from './activity.service';
import { AppError } from '../middlewares/error.middleware';
import { ProjectRole, GlobalRole } from '@prisma/client';

export async function createProject(creatorId: string, input: CreateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description,
      },
    });

    // Automatically assign creator as PROJECT_MANAGER
    await tx.projectMember.create({
      data: {
        projectId: project.id,
        userId: creatorId,
        role: ProjectRole.PROJECT_MANAGER,
      },
    });

    await recordActivity(
      {
        userId: creatorId,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        entityType: 'Project',
        entityId: project.id,
        metadata: { name: project.name },
      },
      tx
    );

    return project;
  });
}

export async function getProjects(
  user: { id: string; globalRole: GlobalRole },
  query: GetProjectsQuery
) {
  const { page = 1, limit = 10, search, isArchived } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (isArchived !== undefined) {
    where.isArchived = isArchived;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Non-admin users can only view projects they are members of
  if (user.globalRole !== GlobalRole.ADMIN) {
    where.members = {
      some: {
        userId: user.id,
      },
    };
  }

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    }),
  ]);

  const formattedProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isArchived: p.isArchived,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    memberCount: p._count.members,
    taskCount: p._count.tasks,
    currentUserRole: user.globalRole === GlobalRole.ADMIN ? 'ADMIN' : p.members[0]?.role || null,
  }));

  return {
    data: formattedProjects,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProjectById(userId: string, globalRole: GlobalRole, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, globalRole: true, isActive: true },
          },
        },
      },
      tasks: {
        select: { id: true, status: true, priority: true, version: true },
      },
    },
  });

  if (!project) {
    throw new AppError('Project not found.', 404);
  }

  // Permission check for non-admin
  if (globalRole !== GlobalRole.ADMIN) {
    const isMember = project.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new AppError('Forbidden. You are not a member of this project.', 403);
    }
  }

  const currentUserMembership = project.members.find((m) => m.userId === userId);

  return {
    ...project,
    currentUserRole: globalRole === GlobalRole.ADMIN ? 'ADMIN' : currentUserMembership?.role || null,
  };
}

export async function updateProject(userId: string, projectId: string, input: UpdateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('Project not found.', 404);
    }

    const updated = await tx.project.update({
      where: { id: projectId },
      data: input,
    });

    await recordActivity(
      {
        userId,
        projectId,
        action: 'PROJECT_UPDATED',
        entityType: 'Project',
        entityId: projectId,
        metadata: { changes: input },
      },
      tx
    );

    return updated;
  });
}

export async function archiveProject(userId: string, projectId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('Project not found.', 404);
    }

    const archived = await tx.project.update({
      where: { id: projectId },
      data: { isArchived: true },
    });

    await recordActivity(
      {
        userId,
        projectId,
        action: 'PROJECT_ARCHIVED',
        entityType: 'Project',
        entityId: projectId,
        metadata: { name: project.name },
      },
      tx
    );

    return archived;
  });
}
