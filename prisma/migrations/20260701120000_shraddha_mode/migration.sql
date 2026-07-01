-- AlterTable
ALTER TABLE "Service" ADD COLUMN "shraddhaModeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "shraddhaWarningText" TEXT;
ALTER TABLE "Service" ADD COLUMN "shraddhaUnbornLabel" TEXT;
ALTER TABLE "Service" ADD COLUMN "shraddhaDeceasedChildLabel" TEXT;
ALTER TABLE "Service" ADD COLUMN "shraddhaChildHelpText" TEXT;

-- CreateEnum
CREATE TYPE "ChildRecordType" AS ENUM ('UNBORN', 'DECEASED');

-- CreateTable
CREATE TABLE "OrderChildRecord" (
    "id" TEXT NOT NULL,
    "type" "ChildRecordType" NOT NULL,
    "parentName" TEXT NOT NULL,
    "childCount" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT,

    CONSTRAINT "OrderChildRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderChildRecord_orderId_idx" ON "OrderChildRecord"("orderId");

-- CreateIndex
CREATE INDEX "OrderChildRecord_orderItemId_idx" ON "OrderChildRecord"("orderItemId");

-- AddForeignKey
ALTER TABLE "OrderChildRecord"
ADD CONSTRAINT "OrderChildRecord_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChildRecord"
ADD CONSTRAINT "OrderChildRecord_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
