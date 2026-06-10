ALTER TABLE "Curator"
ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canEditPostPurchase" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "canEditSupport" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "canViewClients" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "ReferralLink" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "curatorId" TEXT NOT NULL,

  CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ReferralLink" (
  "id",
  "slug",
  "active",
  "isPrimary",
  "createdAt",
  "updatedAt",
  "curatorId"
)
SELECT
  md5(random()::text || clock_timestamp()::text || "id"),
  "slug",
  "active",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  "id"
FROM "Curator"
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "ReferralLink_slug_key" ON "ReferralLink"("slug");
CREATE INDEX "ReferralLink_active_idx" ON "ReferralLink"("active");
CREATE INDEX "ReferralLink_curatorId_idx" ON "ReferralLink"("curatorId");
CREATE UNIQUE INDEX "ReferralLink_curatorId_primary_key"
ON "ReferralLink"("curatorId")
WHERE "isPrimary" = true;

ALTER TABLE "ReferralLink"
ADD CONSTRAINT "ReferralLink_curatorId_fkey"
FOREIGN KEY ("curatorId") REFERENCES "Curator"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
