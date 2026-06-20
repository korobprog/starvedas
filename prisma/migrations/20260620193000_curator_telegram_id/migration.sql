ALTER TABLE "Curator"
  ADD COLUMN "telegramId" TEXT;

CREATE UNIQUE INDEX "Curator_telegramId_key" ON "Curator"("telegramId");
