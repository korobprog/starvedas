import { NextResponse } from "next/server";
import { z } from "zod";
import { setAuthSession } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import {
  getTelegramBotToken,
  validateTelegramMiniAppInitData
} from "@/server/telegram-mini-app";

const curatorMiniAppAuthSchema = z.object({
  initData: z.string().min(10)
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
  const parsed = curatorMiniAppAuthSchema.safeParse(json);

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

  const curator = await prisma.curator.findFirst({
    where: {
      active: true,
      telegramId: String(telegramData.user.id),
      user: {
        active: true
      }
    },
    select: {
      id: true,
      name: true,
      slug: true,
      userId: true
    }
  });

  if (!curator?.userId) {
    return NextResponse.json(
      {
        message:
          "Telegram ID не привязан к куратору. Передайте администратору ваш ID: " +
          telegramData.user.id
      },
      { status: 403 }
    );
  }

  await setAuthSession(curator.userId);

  return NextResponse.json({
    curator: {
      id: curator.id,
      name: curator.name,
      slug: curator.slug
    }
  });
}
