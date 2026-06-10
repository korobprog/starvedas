ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'WAITING_PAYMENT_VERIFICATION';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'WAITING_PAYMENT_VERIFICATION';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'AWAITING_VERIFICATION';

CREATE TABLE "CuratorPaymentOption" (
  "id" TEXT NOT NULL,
  "providerCode" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "instructions" TEXT,
  "bankName" TEXT,
  "recipientName" TEXT,
  "accountNumber" TEXT,
  "phone" TEXT,
  "paymentComment" TEXT,
  "verificationPeriod" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "curatorId" TEXT NOT NULL,

  CONSTRAINT "CuratorPaymentOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CuratorPaymentOption_curatorId_providerCode_key"
ON "CuratorPaymentOption"("curatorId", "providerCode");

CREATE INDEX "CuratorPaymentOption_providerCode_idx"
ON "CuratorPaymentOption"("providerCode");

ALTER TABLE "CuratorPaymentOption"
ADD CONSTRAINT "CuratorPaymentOption_curatorId_fkey"
FOREIGN KEY ("curatorId") REFERENCES "Curator"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CuratorPaymentOption"
ADD CONSTRAINT "CuratorPaymentOption_providerCode_fkey"
FOREIGN KEY ("providerCode") REFERENCES "PaymentProvider"("code")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PaymentProvider" (
  "id",
  "code",
  "name",
  "description",
  "active",
  "sortOrder",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'default-payment-provider-custom-card',
    'custom_card',
    'Перевод на карту',
    'Резервная ручная оплата переводом на карту по реквизитам администратора или куратора.',
    true,
    30,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'default-payment-provider-custom-phone',
    'custom_phone',
    'Перевод по номеру телефона',
    'Резервная ручная оплата переводом по номеру телефона по инструкциям администратора или куратора.',
    true,
    40,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "PaymentMethod" (
  "id",
  "code",
  "name",
  "description",
  "active",
  "sortOrder",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'default-payment-method-custom-card',
    'custom_card',
    'Перевод на карту',
    'Резервная оплата переводом на карту по реквизитам администратора или куратора.',
    true,
    70,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'default-payment-method-custom-phone',
    'custom_phone',
    'Перевод по номеру телефона',
    'Резервная оплата переводом по номеру телефона, если внешняя платежная система недоступна.',
    true,
    80,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "CuratorPaymentOption" (
  "id",
  "curatorId",
  "providerCode",
  "allowed",
  "enabled",
  "instructions",
  "verificationPeriod",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || c."id" || p."code"),
  c."id",
  p."code",
  CASE WHEN p."code" IN ('custom_card', 'custom_phone') THEN c."isSystem" ELSE true END,
  CASE WHEN p."code" IN ('custom_card', 'custom_phone') THEN c."isSystem" ELSE true END,
  CASE
    WHEN p."code" IN ('custom_card', 'custom_phone') AND c."isSystem"
      THEN 'Используйте резервный перевод только если не получается оплатить через PayForm или Prodamus. После перевода нажмите «Сообщить об оплате» и отправьте чек.'
    ELSE NULL
  END,
  CASE
    WHEN p."code" IN ('custom_card', 'custom_phone') AND c."isSystem"
      THEN 'Обычно проверка занимает до 1 рабочего дня.'
    ELSE NULL
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Curator" c
CROSS JOIN "PaymentProvider" p
WHERE p."code" IN ('payform', 'prodamus', 'custom_card', 'custom_phone')
ON CONFLICT ("curatorId", "providerCode") DO NOTHING;
