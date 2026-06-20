import { ClientFunnelStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setClientSession } from "@/server/client-auth";
import { recordClientFunnelEvent } from "@/server/client-profiles";
import {
  ensureSystemCurator,
  findActiveCuratorByReferralSlug,
  normalizeReferralSlug,
  referralCookieMaxAge,
  referralCookieName
} from "@/server/referrals";
import { getSourceDomainFromHeaders } from "@/server/source-domain";
import {
  getTelegramBotToken,
  getTelegramDisplayName,
  getTelegramUsername,
  validateTelegramMiniAppInitData
} from "@/server/telegram-mini-app";

const telegramMiniAppAuthSchema = z.object({
  initData: z.string().min(10),
  referralSlug: z.string().trim().max(120).optional()
});

export async function POST(request: Request) {
  const botToken = getTelegramBotToken();

  if (!botToken) {
    return NextResponse.json(
      { message: "CURATOR_TELEGRAM_BOT_TOKEN is not configured" },
      { status: 503 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = telegramMiniAppAuthSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Некорректные данные Telegram" },
      { status: 400 }
    );
  }

  let telegramData: ReturnType<typeof validateTelegramMiniAppInitData>;

  try {
    telegramData = validateTelegramMiniAppInitData(
      parsed.data.initData,
      botToken
    );
  } catch {
    return NextResponse.json(
      { message: "Не удалось проверить вход через Telegram" },
      { status: 401 }
    );
  }

  const sourceDomain = getSourceDomainFromHeaders(request.headers);
  const telegramId = String(telegramData.user.id);
  const telegram = getTelegramUsername(telegramData.user);
  const telegramName = getTelegramDisplayName(telegramData.user);
  const fallbackName = telegramName || telegram || "Клиент";
  const requestedReferralSlug = normalizeReferralSlug(
    telegramData.startParam || parsed.data.referralSlug
  );
  const referralCurator = requestedReferralSlug
    ? await findActiveCuratorByReferralSlug(requestedReferralSlug)
    : null;
  const curator = referralCurator ?? (await ensureSystemCurator());
  const appliedReferralSlug = referralCurator ? requestedReferralSlug : null;

  const client = await prisma.$transaction(async (tx) => {
    const existing = await tx.clientProfile.findFirst({
      orderBy: { updatedAt: "desc" },
      where: {
        OR: [{ telegramId }, ...(telegram ? [{ sourceDomain, telegram }] : [])]
      },
      select: {
        consentMailings: true,
        consentPersonalData: true,
        curatorId: true,
        email: true,
        id: true,
        name: true,
        phone: true,
        referralSlug: true,
        telegram: true
      }
    });

    const nextClient = existing
      ? await tx.clientProfile.update({
          where: { id: existing.id },
          data: {
            curatorId: appliedReferralSlug ? curator.id : existing.curatorId,
            name: existing.name?.trim() || fallbackName,
            referralSlug: appliedReferralSlug ?? existing.referralSlug,
            source: "telegram-mini-app",
            sourceDomain,
            telegram: telegram ?? existing.telegram,
            telegramAuthDate: telegramData.authDate,
            telegramFirstName: telegramData.user.first_name ?? null,
            telegramId,
            telegramLastName: telegramData.user.last_name ?? null,
            telegramPhotoUrl: telegramData.user.photo_url ?? null
          },
          select: {
            consentMailings: true,
            consentPersonalData: true,
            curator: { select: { name: true, slug: true } },
            email: true,
            id: true,
            name: true,
            phone: true,
            referralSlug: true,
            telegram: true,
            telegramPhotoUrl: true
          }
        })
      : await tx.clientProfile.create({
          data: {
            curatorId: curator.id,
            name: fallbackName,
            referralSlug: appliedReferralSlug ?? curator.slug,
            source: "telegram-mini-app",
            sourceDomain,
            status: ClientFunnelStatus.VISITED,
            telegram,
            telegramAuthDate: telegramData.authDate,
            telegramFirstName: telegramData.user.first_name ?? null,
            telegramId,
            telegramLastName: telegramData.user.last_name ?? null,
            telegramPhotoUrl: telegramData.user.photo_url ?? null
          },
          select: {
            consentMailings: true,
            consentPersonalData: true,
            curator: { select: { name: true, slug: true } },
            email: true,
            id: true,
            name: true,
            phone: true,
            referralSlug: true,
            telegram: true,
            telegramPhotoUrl: true
          }
        });

    await recordClientFunnelEvent(tx, {
      clientId: nextClient.id,
      curatorId: appliedReferralSlug ? curator.id : undefined,
      referralSlug: appliedReferralSlug ?? nextClient.referralSlug,
      source: "telegram-mini-app",
      status: ClientFunnelStatus.VISITED
    });

    return nextClient;
  });

  await setClientSession(client.id);

  const response = NextResponse.json({
    client,
    referralSlug: appliedReferralSlug,
    startParam: telegramData.startParam ?? null
  });

  if (appliedReferralSlug) {
    response.cookies.set(referralCookieName, appliedReferralSlug, {
      httpOnly: true,
      maxAge: referralCookieMaxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
  }

  return response;
}
