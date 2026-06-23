import { NextResponse, type NextRequest } from "next/server";
import {
  accountingSourceDomains,
  syncAccountingReport
} from "@/server/accounting-reports";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.ACCOUNTING_SYNC_SECRET?.trim();

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-accounting-sync-secret");

  return Boolean(secret && (bearer === secret || headerSecret === secret));
}

async function handler(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];

  for (const sourceDomain of accountingSourceDomains) {
    try {
      const result = await syncAccountingReport(sourceDomain);
      results.push({
        operationCount: result.report.operationCount,
        sourceDomain,
        status: result.report.lastSyncStatus
      });
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : "Unknown error",
        operationCount: 0,
        sourceDomain,
        status: "ERROR"
      });
    }
  }

  const hasErrors = results.some((result) => result.status === "ERROR");

  return NextResponse.json(
    { ok: !hasErrors, results },
    { status: hasErrors ? 500 : 200 }
  );
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
