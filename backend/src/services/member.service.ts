import { prisma } from '../db/prisma';
import { AddMemberInput, UpdateMemberRoleInput } from '../schemas/member.schema';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { AppError } from '../middlewares/error.middleware';

export async function addMember(actorUserId: string, projectId: string, input: AddMemberInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('Project not found.', 404);
    }

    const userToAdd = await tx.user.findUnique({ where: { id: input.userId } });
    if (!userToAdd || !userToAdd.isActive) {
      throw new AppError('User not found or is deactivated.', 404);
    }

    const existingMember = await tx.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: input.userId,
        },
      },
    });

    if (existingMember) {
      throw new AppError('User is already a member of this project.', 400);
    }

    const member = await tx.projectMember.create({
      data: {
        projectId,
        userId: input.userId,
        role: input.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, globalRole: true, isActive: true },
        },
      },
    });

    await recordActivity(
      {
        userId: actorUserId,
        projectId,
        action: 'MEMBER_ADDED',
        entityType: 'ProjectMember',
        entityId: member.id,
        metadata: { addedUserId: input.userId, role: input.role, projectName: project.name },
      },
      tx
    );

    await createNotification(
      {
        userId: input.userId,
        actorUserId,
        type: 'MEMBERSHIP_ADDED',
        title: 'Added to Project',
        message: `You were added to project "${project.name}" as ${input.role}`,
        link: `/projects/${projectId}`,
      },
      tx
    );

    return member;
  });
}

export async function getMembers(projectId: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          globalRole: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return members;
}

export async function updateMemberRole(
  actorUserId: string,
  projectId: string,
  memberId: string,
  input: UpdateMemberRoleInput
) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.projectMember.findUnique({
      where: { id: memberId },
      include: { project: true },
    });

    if (!member || member.projectId !== projectId) {
      throw new AppError('Project member record not found.', 404);
    }

    const updated = await tx.projectMember.update({
      where: { id: memberId },
      data: { role: input.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, globalRole: true, isActive: true },
        },
      },
    });

    await recordActivity(
      {
        userId: actorUserId,
        projectId,
        action: 'MEMBER_ROLE_UPDATED',
        entityType: 'ProjectMember',
        entityId: memberId,
        metadata: { oldRole: member.role, newRole: input.role },
      },
      tx
    );

    await createNotification(
      {
        userId: member.userId,
        actorUserId,
        type: 'MEMBERSHIP_ROLE_CHANGED',
        title: 'Project Role Updated',
        message: `Your role in "${member.project.name}" was changed to ${input.role}`,
        link: `/projects/${projectId}`,
      },
      tx
    );

    return updated;
  });
}

export async function removeMember(actorUserId: string, projectId: string, memberId: string) {
  return prisma.$transaction(async (tx) => {
    const member = await tx.projectMember.findUnique({
      where: { id: memberId },
      include: { project: true },
    });

    if (!member || member.projectId !== projectId) {
      throw new AppError('Project member record not found.', 404);
    }

    await tx.projectMember.delete({
      where: { id: memberId },
    });

    await recordActivity(
      {
        userId: actorUserId,
        projectId,
        action: 'MEMBER_REMOVED',
        entityType: 'ProjectMember',
        entityId: memberId,
        metadata: { removedUserId: member.userId, projectName: member.project.name },
      },
      tx
    );

    await createNotification(
      {
        userId: member.userId,
        actorUserId,
        type: 'MEMBERSHIP_REMOVED',
        title: 'Removed from Project',
        message: `You were removed from project "${member.project.name}"`,
      },
      tx
    );

    return { message: 'Member removed successfully' };
  });
}
