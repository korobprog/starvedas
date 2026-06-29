CREATE TABLE "OrderRevision" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "note" TEXT,
    "snapshot" JSONB NOT NULL,
    "sourceRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "actorUserId" TEXT,

    CONSTRAINT "OrderRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderRevision_orderId_createdAt_idx" ON "OrderRevision"("orderId", "createdAt");
CREATE INDEX "OrderRevision_actorUserId_createdAt_idx" ON "OrderRevision"("actorUserId", "createdAt");
CREATE INDEX "OrderRevision_eventType_createdAt_idx" ON "OrderRevision"("eventType", "createdAt");

ALTER TABLE "OrderRevision"
ADD CONSTRAINT "OrderRevision_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderRevision"
ADD CONSTRAINT "OrderRevision_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
