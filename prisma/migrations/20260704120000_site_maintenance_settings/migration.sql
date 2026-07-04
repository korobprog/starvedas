ALTER TABLE "OrganizationSettings"
ADD COLUMN "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "maintenanceMessage" TEXT,
ADD COLUMN "maintenanceTelegram" TEXT;
