CREATE TABLE "AccountingReport" (
    "id" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "spreadsheetId" TEXT,
    "spreadsheetUrl" TEXT,
    "accountantEmail" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT NOT NULL DEFAULT 'NEVER',
    "lastSyncError" TEXT,
    "lastSyncedPeriodStart" TIMESTAMP(3),
    "lastSyncedPeriodEnd" TIMESTAMP(3),
    "operationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingSyncLog" (
    "id" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "rowsAdded" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "operationCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "reportId" TEXT,

    CONSTRAINT "AccountingSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingReport_sourceDomain_key" ON "AccountingReport"("sourceDomain");
CREATE INDEX "AccountingReport_sourceDomain_idx" ON "AccountingReport"("sourceDomain");
CREATE INDEX "AccountingSyncLog_sourceDomain_startedAt_idx" ON "AccountingSyncLog"("sourceDomain", "startedAt");
CREATE INDEX "AccountingSyncLog_reportId_idx" ON "AccountingSyncLog"("reportId");

ALTER TABLE "AccountingSyncLog" ADD CONSTRAINT "AccountingSyncLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AccountingReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
