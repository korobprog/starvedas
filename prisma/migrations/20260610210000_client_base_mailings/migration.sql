CREATE TYPE "ClientFunnelStatus" AS ENUM (
  'VISITED',
  'STARTED_CHECKOUT',
  'DID_NOT_BUY',
  'BOUGHT'
);

ALTER TABLE "ClientProfile"
ADD COLUMN "consentMailings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "consentMailingsAt" TIMESTAMP(3),
ADD COLUMN "consentMailingsSource" TEXT,
ADD COLUMN "status" "ClientFunnelStatus" NOT NULL DEFAULT 'VISITED',
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'site',
ADD COLUMN "referralSlug" TEXT,
ADD COLUMN "lastVisitedAt" TIMESTAMP(3),
ADD COLUMN "checkoutStartedAt" TIMESTAMP(3),
ADD COLUMN "didNotBuyAt" TIMESTAMP(3),
ADD COLUMN "boughtAt" TIMESTAMP(3),
ADD COLUMN "curatorId" TEXT;

UPDATE "ClientProfile" AS client
SET
  "curatorId" = latest_order."curatorId",
  "status" = CASE
    WHEN paid_order."clientId" IS NOT NULL THEN 'BOUGHT'::"ClientFunnelStatus"
    WHEN unpaid_order."clientId" IS NOT NULL THEN 'DID_NOT_BUY'::"ClientFunnelStatus"
    ELSE 'VISITED'::"ClientFunnelStatus"
  END,
  "boughtAt" = paid_order."paidAt",
  "didNotBuyAt" = CASE
    WHEN paid_order."clientId" IS NULL THEN unpaid_order."didNotBuyAt"
    ELSE NULL
  END
FROM (
  SELECT DISTINCT ON ("clientId")
    "clientId",
    "curatorId"
  FROM "Order"
  WHERE "clientId" IS NOT NULL
  ORDER BY "clientId", "createdAt" DESC
) AS latest_order
LEFT JOIN (
  SELECT
    "clientId",
    MAX("updatedAt") AS "paidAt"
  FROM "Order"
  WHERE "clientId" IS NOT NULL
    AND "status" = 'PAID'
  GROUP BY "clientId"
) AS paid_order
  ON paid_order."clientId" = latest_order."clientId"
LEFT JOIN (
  SELECT
    "clientId",
    MAX("updatedAt") AS "didNotBuyAt"
  FROM "Order"
  WHERE "clientId" IS NOT NULL
    AND "status" <> 'PAID'
  GROUP BY "clientId"
) AS unpaid_order
  ON unpaid_order."clientId" = latest_order."clientId"
WHERE client."id" = latest_order."clientId";

CREATE TABLE "ClientEvent" (
  "id" TEXT NOT NULL,
  "status" "ClientFunnelStatus" NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'site',
  "referralSlug" TEXT,
  "visitorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clientId" TEXT,
  "curatorId" TEXT,

  CONSTRAINT "ClientEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientProfile_status_idx"
ON "ClientProfile"("status");

CREATE INDEX "ClientProfile_consentMailings_idx"
ON "ClientProfile"("consentMailings");

CREATE INDEX "ClientProfile_curatorId_idx"
ON "ClientProfile"("curatorId");

CREATE INDEX "ClientProfile_updatedAt_idx"
ON "ClientProfile"("updatedAt");

CREATE INDEX "ClientEvent_status_idx"
ON "ClientEvent"("status");

CREATE INDEX "ClientEvent_visitorId_idx"
ON "ClientEvent"("visitorId");

CREATE INDEX "ClientEvent_clientId_idx"
ON "ClientEvent"("clientId");

CREATE INDEX "ClientEvent_curatorId_idx"
ON "ClientEvent"("curatorId");

CREATE INDEX "ClientEvent_createdAt_idx"
ON "ClientEvent"("createdAt");

ALTER TABLE "ClientProfile"
ADD CONSTRAINT "ClientProfile_curatorId_fkey"
FOREIGN KEY ("curatorId") REFERENCES "Curator"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientEvent"
ADD CONSTRAINT "ClientEvent_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClientEvent"
ADD CONSTRAINT "ClientEvent_curatorId_fkey"
FOREIGN KEY ("curatorId") REFERENCES "Curator"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
