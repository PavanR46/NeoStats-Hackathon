/*
  Warnings:

  - A unique constraint covering the columns `[ticketNumber]` on the table `Task` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('MANUAL', 'SLA_BREACH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'ESCALATED';
ALTER TYPE "TaskStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "escalationLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "firstResponseAt" TIMESTAMP(3),
ADD COLUMN     "reopenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "requesterId" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "slaBreachedAt" TIMESTAMP(3),
ADD COLUMN     "slaResolveDueAt" TIMESTAMP(3),
ADD COLUMN     "slaResponseDueAt" TIMESTAMP(3),
ADD COLUMN     "ticketNumber" SERIAL NOT NULL;

-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "priority" "TaskPriority" NOT NULL,
    "responseMinutes" INTEGER NOT NULL,
    "resolveMinutes" INTEGER NOT NULL,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "fromLevel" INTEGER NOT NULL,
    "toLevel" INTEGER NOT NULL,
    "type" "EscalationType" NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedById" TEXT,
    "escalatedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "metric" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlaPolicy_projectId_priority_key" ON "SlaPolicy"("projectId", "priority");

-- CreateIndex
CREATE INDEX "Escalation_taskId_idx" ON "Escalation"("taskId");

-- CreateIndex
CREATE INDEX "Escalation_createdAt_idx" ON "Escalation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_projectId_metric_key" ON "KpiTarget"("projectId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "Task_ticketNumber_key" ON "Task"("ticketNumber");

-- CreateIndex
CREATE INDEX "Task_slaResolveDueAt_idx" ON "Task"("slaResolveDueAt");

-- CreateIndex
CREATE INDEX "Task_resolvedAt_idx" ON "Task"("resolvedAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_escalatedById_fkey" FOREIGN KEY ("escalatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiTarget" ADD CONSTRAINT "KpiTarget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
