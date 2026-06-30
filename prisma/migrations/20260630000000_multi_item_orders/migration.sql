-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "titleSnapshot" TEXT NOT NULL,
    "priceRubSnapshot" INTEGER NOT NULL,
    "priceUnitSnapshot" "PriceUnit" NOT NULL DEFAULT 'PER_PARTICIPANT',
    "currencySnapshot" TEXT NOT NULL DEFAULT 'RUB',
    "vatTaxTypeSnapshot" INTEGER NOT NULL DEFAULT 0,
    "receiptNameSnapshot" TEXT,
    "isSubscriptionSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionStartsAtSnapshot" TIMESTAMP(3),
    "subscriptionEndsAtSnapshot" TIMESTAMP(3),
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "participantsText" TEXT NOT NULL DEFAULT '',
    "amountRub" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "isMultiItem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderServiceOption"
ADD COLUMN "orderItemId" TEXT,
ADD COLUMN "serviceTitleSnapshot" TEXT;

-- AlterTable
ALTER TABLE "OrderParticipant" ADD COLUMN "orderItemId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_orderId_sortOrder_idx" ON "OrderItem"("orderId", "sortOrder");

-- CreateIndex
CREATE INDEX "OrderItem_serviceId_idx" ON "OrderItem"("serviceId");

-- CreateIndex
CREATE INDEX "OrderServiceOption_orderItemId_idx" ON "OrderServiceOption"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderParticipant_orderItemId_idx" ON "OrderParticipant"("orderItemId");

-- AddForeignKey
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderServiceOption"
ADD CONSTRAINT "OrderServiceOption_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderParticipant"
ADD CONSTRAINT "OrderParticipant_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
