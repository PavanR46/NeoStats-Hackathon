-- AlterTable
ALTER TABLE "Escalation" ADD COLUMN     "fromAssigneeId" TEXT;

-- CreateIndex
CREATE INDEX "Escalation_fromAssigneeId_idx" ON "Escalation"("fromAssigneeId");

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_fromAssigneeId_fkey" FOREIGN KEY ("fromAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
