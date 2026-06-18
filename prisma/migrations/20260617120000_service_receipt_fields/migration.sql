-- Add receipt fields for payment fiscalization
ALTER TABLE "Service" ADD COLUMN "receiptName" TEXT;
ALTER TABLE "Service" ADD COLUMN "vatTaxType" INTEGER NOT NULL DEFAULT 0;
