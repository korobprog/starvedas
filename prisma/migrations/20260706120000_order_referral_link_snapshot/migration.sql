ALTER TABLE "Order" ADD COLUMN "referralLinkId" TEXT;
ALTER TABLE "Order" ADD COLUMN "referralLinkTitleSnapshot" TEXT;

UPDATE "Order" AS o
SET
  "referralLinkId" = rl."id",
  "referralLinkTitleSnapshot" = COALESCE(NULLIF(BTRIM(rl."title"), ''), rl."slug")
FROM "ReferralLink" AS rl
WHERE o."referralSlug" = rl."slug"
  AND o."referralLinkId" IS NULL;

CREATE INDEX "Order_referralLinkId_idx" ON "Order"("referralLinkId");

ALTER TABLE "Order"
ADD CONSTRAINT "Order_referralLinkId_fkey"
FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
