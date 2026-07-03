CREATE TYPE "ParticipantListClaimRole" AS ENUM ('CURATOR', 'STATISTICIAN');

ALTER TABLE "ParticipantList"
ADD COLUMN "claimedByRole" "ParticipantListClaimRole",
ADD COLUMN "claimedByUserId" TEXT,
ADD COLUMN "claimedByCuratorId" TEXT,
ADD COLUMN "claimedAt" TIMESTAMP(3),
ADD COLUMN "copiedAt" TIMESTAMP(3);

CREATE INDEX "ParticipantList_claimedByRole_idx" ON "ParticipantList"("claimedByRole");
CREATE INDEX "ParticipantList_claimedByUserId_idx" ON "ParticipantList"("claimedByUserId");
CREATE INDEX "ParticipantList_claimedByCuratorId_idx" ON "ParticipantList"("claimedByCuratorId");
CREATE INDEX "ParticipantList_claimedAt_idx" ON "ParticipantList"("claimedAt");

ALTER TABLE "ParticipantList"
ADD CONSTRAINT "ParticipantList_claimedByUserId_fkey"
FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParticipantList"
ADD CONSTRAINT "ParticipantList_claimedByCuratorId_fkey"
FOREIGN KEY ("claimedByCuratorId") REFERENCES "Curator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
