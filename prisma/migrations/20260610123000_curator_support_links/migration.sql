ALTER TABLE "Curator"
ADD COLUMN "supportButtonLabel" TEXT,
ADD COLUMN "supportEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "supportUrl" TEXT;

UPDATE "Curator"
SET
  "supportButtonLabel" = 'Написать вопрос администратору',
  "supportUrl" = 'https://t.me/art_om108',
  "supportEnabled" = true
WHERE "slug" = 'administrator'
  AND "supportUrl" IS NULL;
