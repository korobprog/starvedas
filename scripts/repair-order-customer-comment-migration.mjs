import { spawn } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const migrationName = "20260702120000_order_customer_comment";
const prisma = new PrismaClient();

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

async function hasFailedMigration() {
  const rows = await prisma.$queryRaw`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE migration_name = ${migrationName}
      AND finished_at IS NULL
      AND rolled_back_at IS NULL
    LIMIT 1
  `;

  return rows.length > 0;
}

async function hasCustomerCommentColumn() {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Order'
        AND column_name = 'customerComment'
    ) AS "exists"
  `;

  return Boolean(rows?.[0]?.exists);
}

async function main() {
  if (!(await hasFailedMigration())) {
    console.log(
      `[migration-repair] no failed ${migrationName} migration found`
    );
    return;
  }

  console.log(`[migration-repair] repairing failed ${migrationName} migration`);

  if (await hasCustomerCommentColumn()) {
    console.log(
      `[migration-repair] Order.customerComment exists; marking ${migrationName} as applied`
    );
    await run("npx", [
      "prisma",
      "migrate",
      "resolve",
      "--applied",
      migrationName
    ]);
    return;
  }

  console.log(
    `[migration-repair] Order.customerComment is missing; marking ${migrationName} as rolled back so migrate deploy can retry`
  );
  await run("npx", [
    "prisma",
    "migrate",
    "resolve",
    "--rolled-back",
    migrationName
  ]);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
