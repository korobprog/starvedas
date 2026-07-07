import { NextResponse, type NextRequest } from "next/server";
import { getCuratorParticipantListReminderSummaries } from "@/server/participant-lists";
import { sendCuratorParticipantListReminderTelegramNotification } from "@/server/telegram-notifications";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CURATOR_LIST_REMINDER_SECRET?.trim();

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-curator-list-reminder-secret");

  return Boolean(secret && (bearer === secret || headerSecret === secret));
}

async function handler(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summaries = await getCuratorParticipantListReminderSummaries();
  const results = await Promise.allSettled(
    summaries.map(async (summary) => {
      const sent = await sendCuratorParticipantListReminderTelegramNotification(
        {
          services: summary.services,
          telegramId: summary.telegramId,
          totalNameCount: summary.totalNameCount
        }
      );

      return {
        curatorId: summary.curatorId,
        nameCount: summary.totalNameCount,
        sent
      };
    })
  );
  const failed = results.filter((result) => result.status === "rejected");

  failed.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Curator participant list reminder failed", result.reason);
    }
  });

  return NextResponse.json(
    {
      failed: failed.length,
      ok: failed.length === 0,
      sent: results.filter(
        (result) => result.status === "fulfilled" && result.value.sent
      ).length,
      total: summaries.length
    },
    { status: failed.length ? 500 : 200 }
  );
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
