ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'prodamus';

UPDATE "PaymentProvider"
SET
  "active" = true,
  "sortOrder" = 10,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'prodamus';

UPDATE "PaymentProvider"
SET
  "sortOrder" = 20,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'custom_card';

UPDATE "PaymentProvider"
SET
  "sortOrder" = 30,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'custom_phone';

UPDATE "CuratorPaymentOption"
SET
  "instructions" = 'Используйте резервный перевод только если не получается оплатить через Prodamus. После перевода нажмите «Сообщить об оплате» и отправьте чек.',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "instructions" = 'Используйте резервный перевод только если не получается оплатить через PayForm или Prodamus. После перевода нажмите «Сообщить об оплате» и отправьте чек.';

DELETE FROM "PaymentProvider"
WHERE "code" = 'payform';
