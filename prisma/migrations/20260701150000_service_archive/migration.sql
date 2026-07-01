-- AlterTable
ALTER TABLE "Service" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Service_archivedAt_active_sortOrder_idx" ON "Service"("archivedAt", "active", "sortOrder");
