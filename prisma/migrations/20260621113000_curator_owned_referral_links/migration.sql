-- Add curator-owned referral link metadata.
ALTER TABLE "ReferralLink" ADD COLUMN "title" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN "createdByCurator" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ReferralLink_curatorId_createdByCurator_idx" ON "ReferralLink"("curatorId", "createdByCurator");
