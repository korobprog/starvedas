ALTER TABLE "Curator"
ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "postPurchaseTitle" TEXT,
ADD COLUMN "postPurchaseText" TEXT,
ADD COLUMN "postPurchaseUrl" TEXT;

ALTER TABLE "Order" ADD COLUMN "publicToken" TEXT;

UPDATE "Order"
SET "publicToken" = md5(random()::text || clock_timestamp()::text || "id")
WHERE "publicToken" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "publicToken" SET NOT NULL;

CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");
