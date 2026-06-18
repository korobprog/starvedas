-- Add editable rite cards inside services and snapshot selected cards in orders.
ALTER TABLE "ClientProfile" ADD COLUMN "sourceDomain" TEXT NOT NULL DEFAULT 'starvedas.ru';
ALTER TABLE "Order" ADD COLUMN "sourceDomain" TEXT NOT NULL DEFAULT 'starvedas.ru';

CREATE TABLE "ServiceOption" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleHi" TEXT,
    "description" TEXT,
    "descriptionEn" TEXT,
    "descriptionHi" TEXT,
    "priceRub" INTEGER NOT NULL,
    "priceUsd" INTEGER,
    "priceInr" INTEGER,
    "priceUnit" "PriceUnit" NOT NULL DEFAULT 'PER_PARTICIPANT',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "ServiceOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderServiceOption" (
    "id" TEXT NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,
    "priceRubSnapshot" INTEGER NOT NULL,
    "priceUnitSnapshot" "PriceUnit" NOT NULL DEFAULT 'PER_PARTICIPANT',
    "quantitySnapshot" INTEGER NOT NULL DEFAULT 1,
    "totalRubSnapshot" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "optionId" TEXT,

    CONSTRAINT "OrderServiceOption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientProfile_sourceDomain_idx" ON "ClientProfile"("sourceDomain");
CREATE INDEX "Order_sourceDomain_idx" ON "Order"("sourceDomain");
CREATE INDEX "ServiceOption_serviceId_active_sortOrder_idx" ON "ServiceOption"("serviceId", "active", "sortOrder");
CREATE INDEX "OrderServiceOption_orderId_sortOrder_idx" ON "OrderServiceOption"("orderId", "sortOrder");
CREATE INDEX "OrderServiceOption_optionId_idx" ON "OrderServiceOption"("optionId");

ALTER TABLE "ServiceOption" ADD CONSTRAINT "ServiceOption_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderServiceOption" ADD CONSTRAINT "OrderServiceOption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderServiceOption" ADD CONSTRAINT "OrderServiceOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ServiceOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
