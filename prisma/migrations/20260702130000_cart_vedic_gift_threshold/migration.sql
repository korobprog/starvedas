-- Add a configurable cart threshold for the astrology gift.
ALTER TABLE "OrganizationSettings"
ADD COLUMN "vedicGiftThresholdRub" INTEGER NOT NULL DEFAULT 6000;

-- Snapshot whether an order qualified for the gift at checkout time.
ALTER TABLE "Order"
ADD COLUMN "vedicGiftEligible" BOOLEAN NOT NULL DEFAULT false;
