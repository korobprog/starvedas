ALTER TABLE "Order"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deleteReason" TEXT,
ADD COLUMN "deletedById" TEXT;

CREATE INDEX "Order_deletedAt_updatedAt_idx" ON "Order"("deletedAt", "updatedAt");
CREATE INDEX "Order_deletedById_deletedAt_idx" ON "Order"("deletedById", "deletedAt");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
