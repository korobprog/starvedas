ALTER TABLE "Service"
ADD COLUMN "isSubscription" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "subscriptionStartsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

ALTER TABLE "Order"
ADD COLUMN "isSubscriptionSnapshot" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "subscriptionStartsAtSnapshot" TIMESTAMP(3),
ADD COLUMN "subscriptionEndsAtSnapshot" TIMESTAMP(3);
