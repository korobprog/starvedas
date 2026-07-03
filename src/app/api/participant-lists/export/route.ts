import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  buildParticipantListPdf,
  buildParticipantListXlsx,
  getParticipantListExportData
} from "@/server/participant-list-exports";
import { getCurrentUser, isAdminRole } from "@/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseParticipantIds(value: string | null) {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function canExport(role: UserRole) {
  return role === UserRole.STATISTICIAN || isAdminRole(role);
}

function attachmentHeaders({
  contentType,
  filename
}: {
  contentType: string;
  filename: string;
}) {
  return {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Content-Type": contentType
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Нужен вход" }, { status: 401 });
  }

  if (!canExport(user.role)) {
    return NextResponse.json({ message: "Недостаточно прав" }, { status: 403 });
  }

  const url = new URL(request.url);
  const listId = url.searchParams.get("listId")?.trim();
  const format = url.searchParams.get("format")?.trim().toLowerCase() ?? "xlsx";
  const participantIds = parseParticipantIds(url.searchParams.get("participantIds"));

  if (!listId) {
    return NextResponse.json({ message: "Список не найден" }, { status: 400 });
  }

  const data = await getParticipantListExportData({
    listId,
    participantIds: participantIds.length ? participantIds : undefined
  });

  if (!data) {
    return NextResponse.json({ message: "Список не найден" }, { status: 404 });
  }

  if (format === "pdf") {
    const buffer = await buildParticipantListPdf(data);

    return new Response(new Uint8Array(buffer), {
      headers: attachmentHeaders({
        contentType: "application/pdf",
        filename: `${data.filenameBase}.pdf`
      })
    });
  }

  if (format === "xlsx") {
    const buffer = await buildParticipantListXlsx(data);

    return new Response(new Uint8Array(buffer), {
      headers: attachmentHeaders({
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: `${data.filenameBase}.xlsx`
      })
    });
  }

  return NextResponse.json({ message: "Неизвестный формат" }, { status: 400 });
}
