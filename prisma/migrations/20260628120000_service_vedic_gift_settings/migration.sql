ALTER TABLE "Service" ADD COLUMN "vedicGiftEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Service" ADD COLUMN "vedicGiftTitle" TEXT;
ALTER TABLE "Service" ADD COLUMN "vedicGiftDescription" TEXT;

UPDATE "Service"
SET
  "vedicGiftEnabled" = true,
  "vedicGiftTitle" = '🎁 Подарок: ведический астрологический разбор',
  "vedicGiftDescription" = 'Разбор по ведической астрологии входит в абонемент.'
WHERE "slug" = 'monthly-pass';
