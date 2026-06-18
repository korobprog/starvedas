-- Allow admins to schedule single-rite cards and hide them after the event time.
ALTER TABLE "ServiceOption" ADD COLUMN "eventStartsAt" TIMESTAMP(3);

CREATE INDEX "ServiceOption_serviceId_active_eventStartsAt_sortOrder_idx"
ON "ServiceOption"("serviceId", "active", "eventStartsAt", "sortOrder");
