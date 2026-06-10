CREATE TYPE "ParticipantChangeAction" AS ENUM ('UPDATED');

ALTER TABLE "OrderParticipant"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "ParticipantChangeHistory" (
  "id" TEXT NOT NULL,
  "action" "ParticipantChangeAction" NOT NULL DEFAULT 'UPDATED',
  "fromFullName" TEXT,
  "toFullName" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "participantId" TEXT NOT NULL,
  "changedById" TEXT,

  CONSTRAINT "ParticipantChangeHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ParticipantChangeHistory_participantId_idx"
ON "ParticipantChangeHistory"("participantId");

CREATE INDEX "ParticipantChangeHistory_changedById_idx"
ON "ParticipantChangeHistory"("changedById");

ALTER TABLE "ParticipantChangeHistory"
ADD CONSTRAINT "ParticipantChangeHistory_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "OrderParticipant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParticipantChangeHistory"
ADD CONSTRAINT "ParticipantChangeHistory_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
