-- Add one shared customer comment/wishes field for the whole order.
ALTER TABLE "Order" ADD COLUMN "customerComment" TEXT;
