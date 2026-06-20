import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { formatMoney } from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import { buildReferralPath, buildReferralUrl } from "@/server/referrals";
import {
  getCuratorTelegramBotUsername,
  getTelegramBotToken
} from "@/server/telegram-mini-app";

type TelegramUser = {
  id: number;
  first_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
};

type TelegramMessage = {
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
};

type TelegramCallbackQuery = {
  data?: string;
  from: TelegramUser;
  id: string;
  message?: TelegramMessage;
};

type TelegramUpdate = {
  callback_query?: TelegramCallbackQuery;
  message?: TelegramMessage;
};

function getPublicOrigin(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // Fallback to request headers below.
    }
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0];
  const host = forwardedHost?.trim() || request.headers.get("host");
  const protocol =
    forwardedProto?.trim() || requestUrl.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
}

function buildCuratorMiniAppUrl(request: Request, nextPath = "/cabinet") {
  const url = new URL("/curator-mini-app", getPublicOrigin(request));

  url.searchParams.set("next", nextPath);

  return url.toString();
}

function buildTelegramMiniAppReferralUrl(slug: string) {
  const botUsername = getCuratorTelegramBotUsername();

  return botUsername
    ? `https://t.me/${botUsername}?startapp=${encodeURIComponent(slug)}`
    : "";
}

async function callTelegramMethod(
  method: string,
  payload: Record<string, unknown>
) {
  const botToken = getTelegramBotToken();

  if (!botToken) {
    throw new Error("CURATOR_TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    throw new Error(`Telegram ${method} failed`);
  }
}

async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  await callTelegramMethod("sendMessage", {
    chat_id: chatId,
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
    text
  });
}

async function answerCallbackQuery(callbackQueryId: string) {
  await callTelegramMethod("answerCallbackQuery", {
    callback_query_id: callbackQueryId
  });
}

async function getCuratorByTelegramId(telegramId: number) {
  return prisma.curator.findFirst({
    where: {
      active: true,
      telegramId: String(telegramId)
    },
    select: {
      id: true,
      name: true,
      referralLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          isPrimary: true,
          slug: true
        }
      },
      slug: true
    }
  });
}

function getPrimaryReferralSlug(curator: {
  referralLinks: Array<{ isPrimary: boolean; slug: string }>;
  slug: string;
}) {
  return (
    curator.referralLinks.find((link) => link.isPrimary)?.slug ?? curator.slug
  );
}

function buildMenuKeyboard(request: Request) {
  return {
    inline_keyboard: [
      [{ text: "📊 Статистика", callback_data: "stats" }],
      [
        {
          text: "👥 Клиенты",
          web_app: {
            url: buildCuratorMiniAppUrl(request, "/cabinet?section=clients")
          }
        },
        {
          text: "💳 Оплаты",
          web_app: {
            url: buildCuratorMiniAppUrl(request, "/cabinet?section=payments")
          }
        }
      ],
      [{ text: "🔗 Моя реферальная ссылка", callback_data: "referral" }],
      [
        {
          text: "🌐 Открыть кабинет",
          web_app: { url: buildCuratorMiniAppUrl(request, "/cabinet") }
        }
      ]
    ]
  };
}

async function buildStatsText(curator: { id: string; name: string }) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const [orders, todayOrders, clientsCount] = await Promise.all([
    prisma.order.findMany({
      where: { curatorId: curator.id },
      select: {
        amountRub: true,
        status: true
      }
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: today },
        curatorId: curator.id
      },
      select: {
        amountRub: true,
        status: true
      }
    }),
    prisma.clientProfile.count({
      where: { curatorId: curator.id }
    })
  ]);

  const paidOrders = orders.filter(
    (order) => order.status === OrderStatus.PAID
  );
  const waitingStatuses = new Set<OrderStatus>([
    OrderStatus.PENDING_PAYMENT,
    OrderStatus.WAITING_PAYMENT_VERIFICATION,
    OrderStatus.DRAFT
  ]);
  const waitingOrders = orders.filter((order) =>
    waitingStatuses.has(order.status)
  );
  const paidAmount = paidOrders.reduce(
    (sum, order) => sum + order.amountRub,
    0
  );
  const todayPaid = todayOrders.filter(
    (order) => order.status === OrderStatus.PAID
  );

  return [
    `📊 Статистика куратора: ${curator.name}`,
    "",
    `Сегодня заявок: ${todayOrders.length}`,
    `Сегодня оплачено: ${todayPaid.length}`,
    "",
    `Всего заявок: ${orders.length}`,
    `Оплачено: ${paidOrders.length}`,
    `Ожидают оплаты: ${waitingOrders.length}`,
    `Клиентов: ${clientsCount}`,
    `Сумма оплат: ${formatMoney(paidAmount, "RUB")}`
  ].join("\n");
}

async function buildReferralText(
  request: Request,
  curator: Awaited<ReturnType<typeof getCuratorByTelegramId>> & {}
) {
  const slug = getPrimaryReferralSlug(curator);
  const origin = getPublicOrigin(request);
  const siteReferral =
    buildReferralUrl(origin, slug) || buildReferralPath(slug);
  const miniAppReferral = buildTelegramMiniAppReferralUrl(slug);

  return [
    "🔗 Ваша реферальная ссылка:",
    siteReferral,
    miniAppReferral ? "" : null,
    miniAppReferral ? "Telegram Mini App ссылка:" : null,
    miniAppReferral || null
  ]
    .filter(Boolean)
    .join("\n");
}

async function handleAuthorizedCuratorMessage(
  request: Request,
  chatId: number,
  from: TelegramUser,
  command?: string
) {
  const curator = await getCuratorByTelegramId(from.id);

  if (!curator) {
    await sendMessage(
      chatId,
      [
        "Telegram ID не привязан к куратору.",
        `Ваш Telegram ID: ${from.id}`,
        "Передайте этот ID администратору, чтобы он добавил его в карточку куратора."
      ].join("\n")
    );
    return;
  }

  if (command === "stats") {
    await sendMessage(chatId, await buildStatsText(curator));
    return;
  }

  if (command === "referral") {
    await sendMessage(chatId, await buildReferralText(request, curator));
    return;
  }

  await sendMessage(
    chatId,
    `Здравствуйте, ${curator.name}. Выберите раздел:`,
    buildMenuKeyboard(request)
  );
}

export async function POST(request: Request) {
  const configuredSecret = process.env.CURATOR_TELEGRAM_WEBHOOK_SECRET?.trim();
  const requestSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (configuredSecret && requestSecret !== configuredSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request
    .json()
    .catch(() => null)) as TelegramUpdate | null;

  if (!update) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message?.chat.id;

      await answerCallbackQuery(callback.id);

      if (chatId) {
        await handleAuthorizedCuratorMessage(
          request,
          chatId,
          callback.from,
          callback.data
        );
      }

      return NextResponse.json({ ok: true });
    }

    const message = update.message;

    if (message?.from && message.chat) {
      const text = message.text?.trim().toLowerCase() ?? "";
      const command = text.startsWith("/stats")
        ? "stats"
        : text.startsWith("/ref")
          ? "referral"
          : undefined;

      await handleAuthorizedCuratorMessage(
        request,
        message.chat.id,
        message.from,
        command
      );
    }
  } catch (error) {
    console.error("Curator Telegram webhook failed", error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
