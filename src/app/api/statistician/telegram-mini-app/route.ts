import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setAuthSession } from "@/server/auth";
import {
  getTelegramBotToken,
  validateTelegramMiniAppInitData
} from "@/server/telegram-mini-app";

const statisticianMiniAppAuthSchema = z.object({
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
  const parsed = statisticianMiniAppAuthSchema.safeParse(json);

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

  const user = await prisma.user.findFirst({
    where: {
      active: true,
      role: {
        in: [UserRole.STATISTICIAN, UserRole.ADMIN, UserRole.SUPER_ADMIN]
      },
      telegramId: String(telegramData.user.id)
    },
    select: {
      id: true,
      name: true,
      role: true
    }
  });

  if (!user) {
    return NextResponse.json(
      {
        message:
          "Telegram ID не привязан к статисту. Передайте администратору ваш ID: " +
          telegramData.user.id
      },
      { status: 403 }
    );
  }

  await setAuthSession(user.id);

  return NextResponse.json({
    user
  });
}
