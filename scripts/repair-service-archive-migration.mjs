import { PrismaClient } from "@prisma/client";

const migrationName = "20260701150000_service_archive";
const prisma = new PrismaClient();

async function existsColumn() {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Service'
        AND column_name = 'archivedAt'
    ) AS "exists"
  `;

  return Boolean(rows?.[0]?.exists);
}

async function existsIndex() {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'Service'
        AND indexname = 'Service_archivedAt_active_sortOrder_idx'
    ) AS "exists"
  `;

  return Boolean(rows?.[0]?.exists);
}

async function main() {
  const failedRows = await prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
    LIMIT 1
  `;

  if (!failedRows.length) {
    console.log(
      `[migration-repair] no failed ${migrationName} migration found`
    );
    return;
  }

  console.log(`[migration-repair] repairing failed ${migrationName} migration`);

  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3)'
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "Service_archivedAt_active_sortOrder_idx" ON "Service"("archivedAt", "active", "sortOrder")'
  );

  const [columnReady, indexReady] = await Promise.all([
    existsColumn(),
    existsIndex()
  ]);

  if (!columnReady || !indexReady) {
    throw new Error(
      `Cannot resolve ${migrationName}: archivedAt column ready=${columnReady}, index ready=${indexReady}`
    );
  }

  await prisma.$executeRaw`
    UPDATE "_prisma_migrations"
    SET finished_at = NOW(),
        applied_steps_count = CASE
          WHEN applied_steps_count < 1 THEN 1
          ELSE applied_steps_count
        END,
        logs = CONCAT(
          COALESCE(logs, ''),
          E'\n[repair-service-archive-migration] Schema objects were verified and migration was marked as applied.'
        )
    WHERE migration_name = ${migrationName}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
  `;

  console.log(`[migration-repair] ${migrationName} marked as applied`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
