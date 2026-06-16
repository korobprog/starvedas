ALTER TABLE "Service" ADD COLUMN "titleEn" TEXT;
ALTER TABLE "Service" ADD COLUMN "titleHi" TEXT;
ALTER TABLE "Service" ADD COLUMN "descriptionEn" TEXT;
ALTER TABLE "Service" ADD COLUMN "descriptionHi" TEXT;
ALTER TABLE "Service" ADD COLUMN "priceUsd" INTEGER;
ALTER TABLE "Service" ADD COLUMN "priceInr" INTEGER;

ALTER TABLE "Order" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'RUB';
ALTER TABLE "PaymentProvider" ADD COLUMN "supportedLocales" TEXT NOT NULL DEFAULT 'ru,en,hi';

UPDATE "PaymentProvider" SET "supportedLocales" = 'ru' WHERE "code" = 'prodamus';
UPDATE "PaymentProvider" SET "supportedLocales" = 'ru,en,hi' WHERE "code" IN ('custom_card', 'custom_phone');
