import bcrypt from 'bcrypt';
import { prisma } from '../db/prisma';
import { CreateUserInput, UpdateUserInput, GetUsersQuery } from '../schemas/user.schema';
import { recordActivity } from './activity.service';
import { AppError } from '../middlewares/error.middleware';

export async function createUser(adminUserId: string, input: CreateUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new AppError('User with this email address already exists.', 400);
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        globalRole: input.globalRole,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await recordActivity(
      {
        userId: adminUserId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        metadata: { email: user.email, role: user.globalRole },
      },
      tx
    );

    return user;
  });
}

export async function getUsers(query: GetUsersQuery) {
  const { page = 1, limit = 10, search, globalRole, isActive } = query;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (globalRole) {
    where.globalRole = globalRole;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projectMemberships: true,
            assignedTasks: true,
          },
        },
      },
    }),
  ]);

  return {
    data: users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      projectMemberships: {
        include: {
          project: {
            select: { id: true, name: true, isArchived: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
}

export async function updateUser(adminUserId: string, targetUserId: string, input: UpdateUserInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const dataToUpdate: any = { ...input };

    if (input.password) {
      dataToUpdate.password = await bcrypt.hash(input.password, 10);
    }

    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await recordActivity(
      {
        userId: adminUserId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: targetUserId,
        metadata: { changes: Object.keys(input) },
      },
      tx
    );

    return updated;
  });
}

export async function deactivateUser(adminUserId: string, targetUserId: string) {
  if (adminUserId === targetUserId) {
    throw new AppError('You cannot deactivate your own admin account.', 400);
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const deactivated = await tx.user.update({
      where: { id: targetUserId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        globalRole: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await recordActivity(
      {
        userId: adminUserId,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: targetUserId,
        metadata: { email: user.email },
      },
      tx
    );

    return deactivated;
  });
}
