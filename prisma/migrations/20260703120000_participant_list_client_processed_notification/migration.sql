-- AlterTable
ALTER TABLE "ParticipantList" ADD COLUMN "clientNamesProcessedNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ParticipantList_clientNamesProcessedNotifiedAt_idx" ON "ParticipantList"("clientNamesProcessedNotifiedAt");
