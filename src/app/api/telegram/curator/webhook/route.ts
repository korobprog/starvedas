import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { formatMoney } from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import {
  claimParticipantListByCurator,
  markOrderParticipantListProcessedByTelegram
} from "@/server/participant-lists";
import { buildReferralPath, buildReferralUrl } from "@/server/referrals";
import {
  createCuratorParticipantListConfirmKeyboard,
  getCuratorParticipantListTelegramDetails
} from "@/server/telegram-notifications";
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

type TelegramResponse = {
  body?: string;
  ok: boolean;
  status: number;
  statusText: string;
};

const telegramRequestTimeoutMs = 15000;
const DEFAULT_TELEGRAM_PROXY_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_TELEGRAM_API_BASE = "https://api.telegram.org";
const defaultTelegramApiIps = ["149.154.167.220"];
const telegramProxyCooldownUntilByUrl = new Map<string, number>();

function getPublicOrigin(request: Request) {
  const configuredOrigin =
    process.env.CURATOR_MINI_APP_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

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

function getTelegramProxyUrl() {
  return (
    process.env.CURATOR_TELEGRAM_PROXY_URL?.trim() ||
    process.env.TELEGRAM_PROXY_URL?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    null
  );
}

function getTelegramApiBase() {
  const configured =
    process.env.CURATOR_TELEGRAM_API_BASE?.trim() ||
    process.env.TELEGRAM_API_BASE?.trim();

  return configured
    ? configured.replace(/\/+$/, "")
    : DEFAULT_TELEGRAM_API_BASE;
}

function getTelegramRelayToken() {
  return (
    process.env.CURATOR_TELEGRAM_RELAY_TOKEN?.trim() ||
    process.env.TELEGRAM_RELAY_TOKEN?.trim() ||
    ""
  );
}

function getTelegramApiIps() {
  return (
    process.env.TELEGRAM_API_IPS?.split(",")
      .map((ip) => ip.trim())
      .filter(Boolean) ?? defaultTelegramApiIps
  );
}

function shouldUseTelegramProxy(proxyUrl: string) {
  const cooldownUntil = telegramProxyCooldownUntilByUrl.get(proxyUrl) ?? 0;

  return cooldownUntil <= Date.now();
}

function markTelegramProxyFailure(proxyUrl: string) {
  const cooldownMs = getTelegramProxyCooldownMs();

  telegramProxyCooldownUntilByUrl.set(proxyUrl, Date.now() + cooldownMs);

  return cooldownMs;
}

function getTelegramProxyCooldownMs() {
  const parsed = Number(
    process.env.CURATOR_TELEGRAM_PROXY_COOLDOWN_MS?.trim() ||
      process.env.TELEGRAM_PROXY_COOLDOWN_MS?.trim()
  );

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return DEFAULT_TELEGRAM_PROXY_COOLDOWN_MS;
}

function formatTelegramErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function parseHttpStatus(rawResponse: string) {
  const [rawHeaders, body = ""] = rawResponse.split("\r\n\r\n");
  const statusLine = rawHeaders?.split("\r\n", 1)[0] ?? "";
  const match = statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/);

  if (!match) {
    throw new Error("Telegram proxy returned an invalid HTTP response");
  }

  const status = Number(match[1]);

  return {
    ok: status >= 200 && status < 300,
    status,
    body: body.slice(0, 500),
    statusText: match[2] || ""
  };
}

async function postJsonViaHttpProxy(
  targetUrl: string,
  payload: Record<string, unknown>,
  proxyUrl: string
): Promise<TelegramResponse> {
  const target = new URL(targetUrl);
  const proxy = new URL(proxyUrl);

  if (proxy.protocol !== "http:") {
    throw new Error("Only http:// Telegram proxy URLs are supported");
  }

  const body = JSON.stringify(payload);
  const proxyPort = Number(proxy.port || 80);
  const targetPort = Number(target.port || 443);

  return new Promise((resolve, reject) => {
    const request = http.request({
      host: proxy.hostname,
      method: "CONNECT",
      path: `${target.hostname}:${targetPort}`,
      port: proxyPort,
      timeout: telegramRequestTimeoutMs
    });

    request.once("connect", (response, socket, head) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(
          new Error(
            `Telegram proxy CONNECT failed: ${response.statusCode ?? "unknown"}`
          )
        );
        return;
      }

      if (head.length > 0) {
        socket.unshift(head);
      }

      const secureSocket = tls.connect({
        servername: target.hostname,
        socket
      });
      const chunks: Buffer[] = [];

      secureSocket.setTimeout(telegramRequestTimeoutMs);
      secureSocket.once("secureConnect", () => {
        secureSocket.write(
          [
            `POST ${target.pathname}${target.search} HTTP/1.1`,
            `Host: ${target.hostname}`,
            "Content-Type: application/json",
            `Content-Length: ${Buffer.byteLength(body)}`,
            "Connection: close",
            "",
            body
          ].join("\r\n")
        );
      });
      secureSocket.on("data", (chunk: Buffer) => chunks.push(chunk));
      secureSocket.once("end", () => {
        try {
          resolve(parseHttpStatus(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(error);
        }
      });
      secureSocket.once("timeout", () => {
        secureSocket.destroy(new Error("Telegram proxy request timed out"));
      });
      secureSocket.once("error", reject);
    });
    request.once("timeout", () => {
      request.destroy(new Error("Telegram proxy CONNECT timed out"));
    });
    request.once("error", reject);
    request.end();
  });
}

async function postJsonViaTelegramIp(
  targetUrl: string,
  payload: Record<string, unknown>,
  ipAddress: string
): Promise<TelegramResponse> {
  const target = new URL(targetUrl);
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        headers: {
          "Content-Type": "application/json",
          Host: target.hostname
        },
        hostname: ipAddress,
        method: "POST",
        path: `${target.pathname}${target.search}`,
        port: 443,
        servername: target.hostname,
        timeout: telegramRequestTimeoutMs
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.once("end", () => {
          const status = response.statusCode ?? 0;

          resolve({
            body: Buffer.concat(chunks).toString("utf8").slice(0, 500),
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage ?? ""
          });
        });
      }
    );

    request.once("timeout", () => {
      request.destroy(new Error("Telegram pinned-IP request timed out"));
    });
    request.once("error", reject);
    request.write(body);
    request.end();
  });
}

async function postTelegramJson(
  url: string,
  payload: Record<string, unknown>
): Promise<TelegramResponse> {
  const viaRelay = getTelegramApiBase() !== DEFAULT_TELEGRAM_API_BASE;
  // Через релей прокси не нужен: он ведёт к api.telegram.org, а не к релею,
  // и мёртвый прокси только съедал бы таймаут на каждом вызове.
  const proxyUrl = viaRelay ? null : getTelegramProxyUrl();

  let proxyError: unknown = null;

  if (proxyUrl && shouldUseTelegramProxy(proxyUrl)) {
    try {
      return await postJsonViaHttpProxy(url, payload, proxyUrl);
    } catch (error) {
      proxyError = error;
      const cooldownMs = markTelegramProxyFailure(proxyUrl);
      console.warn(
        `Curator Telegram webhook proxy request failed; trying direct connection and cooling down proxy for ${cooldownMs}ms`,
        error instanceof Error ? error.message : error
      );
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    telegramRequestTimeoutMs
  );

  try {
    const relayToken = getTelegramRelayToken();
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        ...(relayToken ? { "x-relay-token": relayToken } : {})
      },
      method: "POST",
      signal: controller.signal
    });
    const body = await response.text().catch(() => "");

    return {
      body: body.slice(0, 500),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    let lastError = error;

    // Пиннинг IP осмыслен только для самого api.telegram.org: адреса релея
    // мы не знаем и подменять их его же хостом нельзя.
    for (const ipAddress of viaRelay ? [] : getTelegramApiIps()) {
      try {
        return await postJsonViaTelegramIp(url, payload, ipAddress);
      } catch (pinnedIpError) {
        lastError = pinnedIpError;
      }
    }

    if (proxyError) {
      throw new Error(
        `Telegram proxy failed (${formatTelegramErrorMessage(proxyError)}); direct fallback failed (${formatTelegramErrorMessage(lastError)})`
      );
    }

    throw lastError;
  } finally {
    clearTimeout(timeout);
  }
}

async function callTelegramMethod(
  method: string,
  payload: Record<string, unknown>
) {
  const botToken = getTelegramBotToken();

  if (!botToken) {
    throw new Error("CURATOR_TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await postTelegramJson(
    `${getTelegramApiBase()}/bot${botToken}/${method}`,
    payload
  );

  if (!response.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status} ${response.statusText} ${response.body ?? ""}`.trim()
    );
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

async function removeReplyKeyboard(chatId: number) {
  await sendMessage(chatId, "Меню обновлено.", {
    remove_keyboard: true
  });
}

async function answerCallbackQuery(
  callbackQueryId: string,
  options?: {
    showAlert?: boolean;
    text?: string;
  }
) {
  await callTelegramMethod("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    show_alert: options?.showAlert,
    text: options?.text
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
      slug: true,
      userId: true
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

function buildMenuKeyboard(
  request: Request,
  mode: "url" | "web_app" = "web_app"
) {
  const clientsUrl = buildCuratorMiniAppUrl(
    request,
    "/cabinet?section=clients"
  );
  const cabinetUrl = buildCuratorMiniAppUrl(request, "/cabinet");
  const clientsButton =
    mode === "web_app"
      ? { text: "👥 Клиенты", web_app: { url: clientsUrl } }
      : { text: "👥 Клиенты", url: clientsUrl };
  const cabinetButton =
    mode === "web_app"
      ? { text: "🌐 Открыть кабинет", web_app: { url: cabinetUrl } }
      : { text: "🌐 Открыть кабинет", url: cabinetUrl };

  return {
    inline_keyboard: [
      [{ text: "📊 Статистика", callback_data: "stats" }],
      [clientsButton],
      [{ text: "🔗 Моя реферальная ссылка", callback_data: "referral" }],
      [cabinetButton]
    ]
  };
}

async function sendMenuMessage(request: Request, chatId: number, text: string) {
  try {
    console.log("Curator Telegram sending menu", { chatId });
    await removeReplyKeyboard(chatId).catch((error) => {
      console.error("Curator Telegram reply keyboard removal failed", error);
    });
    await sendMessage(chatId, text, buildMenuKeyboard(request));
    console.log("Curator Telegram menu sent", { chatId, mode: "web_app" });
  } catch (error) {
    console.error(
      "Curator Telegram web_app menu failed, retrying with url buttons",
      error
    );
    await sendMessage(chatId, text, buildMenuKeyboard(request, "url"));
    console.log("Curator Telegram menu sent", { chatId, mode: "url" });
  }
}

async function buildStatsText(curator: { id: string; name: string }) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const [orders, todayOrders, clientsCount] = await Promise.all([
    prisma.order.findMany({
      where: { curatorId: curator.id, deletedAt: null },
      select: {
        amountRub: true,
        status: true
      }
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: today },
        curatorId: curator.id,
        deletedAt: null
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

  await sendMenuMessage(
    request,
    chatId,
    `Здравствуйте, ${curator.name}. Выберите раздел:`
  );
}

async function handleCuratorParticipantListCallback({
  callback,
  chatId,
  data
}: {
  callback: TelegramCallbackQuery;
  chatId?: number;
  data: string;
}) {
  const [action, listId] = data.split(":", 2);

  if (!listId) {
    await answerCallbackQuery(callback.id, {
      showAlert: true,
      text: "Некорректная кнопка списка."
    });
    return;
  }

  if (action === "cur_list") {
    const details = await getCuratorParticipantListTelegramDetails({
      curatorTelegramId: callback.from.id,
      listId
    });

    await answerCallbackQuery(callback.id, {
      showAlert: !details,
      text: details ? "Список открыт." : "Список не найден или недоступен."
    }).catch((error) => {
      console.error("Curator list open callback answer failed", error);
    });

    if (details && chatId) {
      await sendMessage(chatId, details.text, details.replyMarkup);
    }

    return;
  }

  if (action === "cur_copy") {
    const details = await getCuratorParticipantListTelegramDetails({
      curatorTelegramId: callback.from.id,
      listId
    });

    await answerCallbackQuery(callback.id, {
      showAlert: !details,
      text: details
        ? "Подтвердите копирование."
        : "Список не найден или недоступен."
    }).catch((error) => {
      console.error("Curator list copy callback answer failed", error);
    });

    if (details && chatId) {
      await sendMessage(
        chatId,
        [
          `Заказ #${details.orderNumber}`,
          "",
          "Подтвердите, что список скопирован.",
          "После подтверждения список исчезнет из активного буфера статиста."
        ].join("\n"),
        createCuratorParticipantListConfirmKeyboard(listId)
      );
    }

    return;
  }

  if (action === "cur_yes") {
    const curator = await getCuratorByTelegramId(callback.from.id);

    if (!curator) {
      await answerCallbackQuery(callback.id, {
        showAlert: true,
        text: "Telegram ID не привязан к куратору."
      });
      return;
    }

    try {
      const result = await claimParticipantListByCurator({
        curatorId: curator.id,
        listId,
        userId: curator.userId ?? null
      });

      await answerCallbackQuery(callback.id, {
        text: result.alreadyClaimed
          ? "Список уже был в работе."
          : "Список взят в работу."
      }).catch((error) => {
        console.error("Curator list claim callback answer failed", error);
      });

      if (chatId) {
        await sendMessage(
          chatId,
          [
            `Заказ #${result.orderNumber}`,
            "",
            result.alreadyClaimed
              ? "Список уже был отмечен как взятый в работу."
              : "Список отмечен как взятый в работу.",
            "У статиста он больше не отображается в активном буфере."
          ].join("\n")
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось отметить список как скопированный.";

      await answerCallbackQuery(callback.id, {
        showAlert: true,
        text: message
      }).catch((answerError) => {
        console.error("Curator list claim error answer failed", answerError);
      });

      if (chatId) {
        await sendMessage(chatId, message);
      }
    }

    return;
  }

  if (action === "cur_no") {
    await answerCallbackQuery(callback.id, {
      text: "Отменено."
    }).catch((error) => {
      console.error("Curator list cancel callback answer failed", error);
    });

    if (chatId) {
      await sendMessage(chatId, "Отменено. Список не изменен.");
    }
  }
}

async function handleTelegramUpdate(request: Request, update: TelegramUpdate) {
  try {
    if (update.callback_query) {
      const callback = update.callback_query;
      const chatId = callback.message?.chat.id;
      const data = callback.data ?? "";

      if (data.startsWith("stat_done:")) {
        const orderId = data.slice("stat_done:".length);
        const result = await markOrderParticipantListProcessedByTelegram({
          orderId,
          telegramId: callback.from.id
        });

        await answerCallbackQuery(callback.id, {
          showAlert: !result.ok,
          text: result.ok
            ? result.alreadyProcessed
              ? "Имена уже были обработаны."
              : `Имена обработаны: ${result.count}`
            : result.reason
        }).catch((error) => {
          console.error("Statistician Telegram callback answer failed", error);
        });

        if (chatId) {
          await sendMessage(
            chatId,
            result.ok
              ? result.alreadyProcessed
                ? `Заказ #${result.orderNumber}: имена уже были обработаны.`
                : `Заказ #${result.orderNumber}: имена отмечены как обработанные. Обработано: ${result.count}.`
              : result.reason
          );
        }

        return;
      }

      if (
        data.startsWith("cur_list:") ||
        data.startsWith("cur_copy:") ||
        data.startsWith("cur_yes:") ||
        data.startsWith("cur_no:")
      ) {
        await handleCuratorParticipantListCallback({
          callback,
          chatId,
          data
        });

        return;
      }

      await answerCallbackQuery(callback.id).catch((error) => {
        console.error("Curator Telegram callback answer failed", error);
      });

      if (chatId) {
        await handleAuthorizedCuratorMessage(
          request,
          chatId,
          callback.from,
          callback.data
        );
      }

      return;
    }

    const message = update.message;

    if (message?.from && message.chat) {
      const text = message.text?.trim().toLowerCase() ?? "";
      const command = text.startsWith("/start")
        ? "menu"
        : text.startsWith("/stats")
          ? "stats"
          : text.startsWith("/ref")
            ? "referral"
            : undefined;

      console.log("Curator Telegram message received", {
        chatId: message.chat.id,
        command,
        fromId: message.from.id,
        text
      });

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
}

export async function POST(request: Request) {
  if (process.env.CURATOR_TELEGRAM_WEBHOOK_ENABLED !== "1") {
    return NextResponse.json({ ok: true, mode: "polling" });
  }
  const configuredSecret = process.env.CURATOR_TELEGRAM_WEBHOOK_SECRET?.trim();
  const requestSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (configuredSecret && requestSecret !== configuredSecret) {
    console.error("Curator Telegram webhook rejected: invalid secret");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await request
    .json()
    .catch(() => null)) as TelegramUpdate | null;

  if (!update) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await handleTelegramUpdate(request, update);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
