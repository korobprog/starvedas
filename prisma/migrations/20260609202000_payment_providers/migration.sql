-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- Seed default payment providers
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
        'default-payment-provider-payform',
        'payform',
        'PayForm',
        'Платежная форма PayForm с переходом на внешнюю страницу оплаты.',
        true,
        10,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'default-payment-provider-prodamus',
        'prodamus',
        'Prodamus',
        'Платежная система Prodamus с базовым адресом https://prodamus.ru.',
        true,
        20,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT ("code") DO NOTHING;
