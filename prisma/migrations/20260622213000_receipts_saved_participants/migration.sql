-- Add receipt metadata to payments.
ALTER TABLE "Payment"
ADD COLUMN "receiptUrl" TEXT,
ADD COLUMN "receiptLabel" TEXT,
ADD COLUMN "receiptUploadedAt" TIMESTAMP(3);

-- Store reusable participant names per client.
CREATE TABLE "SavedParticipant" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "SavedParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedParticipant_clientId_fullName_key" ON "SavedParticipant"("clientId", "fullName");
CREATE INDEX "SavedParticipant_clientId_idx" ON "SavedParticipant"("clientId");

ALTER TABLE "SavedParticipant"
ADD CONSTRAINT "SavedParticipant_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
