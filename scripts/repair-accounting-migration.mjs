import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const MIGRATION_NAME = "20260623140000_accounting_reports";

function run(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`[migration-repair] running: ${command} ${args.join(" ")}`);
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "null"} signal ${signal ?? "null"}`
        )
      );
    });
    child.once("error", reject);
  });
}

const prisma = new PrismaClient();

try {
  const failedMigrations = await prisma.$queryRawUnsafe(
    `SELECT migration_name
       FROM _prisma_migrations
      WHERE migration_name = $1
        AND finished_at IS NULL
        AND rolled_back_at IS NULL`,
    MIGRATION_NAME
  );

  if (failedMigrations.length === 0) {
    console.log(
      `[migration-repair] no failed ${MIGRATION_NAME} migration found`
    );
    process.exit(0);
  }

  console.log(
    `[migration-repair] repairing failed ${MIGRATION_NAME} migration`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AccountingReport" (
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
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AccountingSyncLog" (
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
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AccountingReport_sourceDomain_key" ON "AccountingReport"("sourceDomain")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AccountingReport_sourceDomain_idx" ON "AccountingReport"("sourceDomain")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AccountingSyncLog_sourceDomain_startedAt_idx" ON "AccountingSyncLog"("sourceDomain", "startedAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AccountingSyncLog_reportId_idx" ON "AccountingSyncLog"("reportId")`
  );

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'AccountingSyncLog_reportId_fkey'
      ) THEN
        ALTER TABLE "AccountingSyncLog"
          ADD CONSTRAINT "AccountingSyncLog_reportId_fkey"
          FOREIGN KEY ("reportId") REFERENCES "AccountingReport"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log(
    `[migration-repair] schema objects are present for ${MIGRATION_NAME}`
  );
} finally {
  await prisma.$disconnect();
}

await run("npx", ["prisma", "migrate", "resolve", "--applied", MIGRATION_NAME]);
console.log(`[migration-repair] marked ${MIGRATION_NAME} as applied`);
