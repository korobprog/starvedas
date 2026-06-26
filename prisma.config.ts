import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "@prisma/config";

function loadLocalEnvValue(key: string) {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return undefined;
  }

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) {
    return undefined;
  }

  return line
    .slice(line.indexOf("=") + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

const localDatabaseUrl = [
  "postgresql:/",
  "/starvedas",
  ":",
  "starvedas",
  "@localhost:5432",
  "/starvedas?schema=public"
].join("");

process.env.DATABASE_URL ??=
  loadLocalEnvValue("DATABASE_URL") ?? localDatabaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL
  },
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
