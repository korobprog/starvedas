-- AlterTable
ALTER TABLE "Service" ADD COLUMN "moduleKey" TEXT;

-- CreateIndex
CREATE INDEX "Service_moduleKey_idx" ON "Service"("moduleKey");

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN "pitriPakshaEnabled" BOOLEAN NOT NULL DEFAULT false;
