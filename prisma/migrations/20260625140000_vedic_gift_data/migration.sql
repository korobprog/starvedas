-- CreateTable
CREATE TABLE "VedicGiftData" (
    "id" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthTime" TEXT,
    "birthTimeUnknown" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "telegram" TEXT,
    "notes" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,

    CONSTRAINT "VedicGiftData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VedicGiftData_orderId_key" ON "VedicGiftData"("orderId");

-- CreateIndex
CREATE INDEX "VedicGiftData_orderId_idx" ON "VedicGiftData"("orderId");

-- CreateIndex
CREATE INDEX "VedicGiftData_processed_idx" ON "VedicGiftData"("processed");

-- CreateIndex
CREATE INDEX "VedicGiftData_createdAt_idx" ON "VedicGiftData"("createdAt");

-- AddForeignKey
ALTER TABLE "VedicGiftData" ADD CONSTRAINT "VedicGiftData_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
