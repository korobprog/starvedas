ALTER TABLE "ClientProfile"
  ADD COLUMN "telegramId" TEXT,
  ADD COLUMN "telegramFirstName" TEXT,
  ADD COLUMN "telegramLastName" TEXT,
  ADD COLUMN "telegramPhotoUrl" TEXT,
  ADD COLUMN "telegramAuthDate" TIMESTAMP(3);

ALTER TABLE "Order"
  ADD COLUMN "referralSlug" TEXT;

CREATE UNIQUE INDEX "ClientProfile_telegramId_key" ON "ClientProfile"("telegramId");
CREATE INDEX "Order_referralSlug_idx" ON "Order"("referralSlug");
