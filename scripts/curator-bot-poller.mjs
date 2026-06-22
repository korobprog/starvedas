import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();
const telegramRequestTimeoutMs = 60000;
const defaultTelegramApiIps = ["149.154.167.220"];

let updateOffset = 0;

function trimEnv(name) {
  return process.env[name]?.trim() || "";
}

function getBotToken() {
  return (
    trimEnv("CURATOR_TELEGRAM_BOT_TOKEN") || trimEnv("TELEGRAM_BOT_TOKEN")
  );
}

function getTelegramProxyUrl() {
  return (
    trimEnv("CURATOR_TELEGRAM_PROXY_URL") ||
    trimEnv("TELEGRAM_PROXY_URL") ||
    trimEnv("HTTPS_PROXY") ||
    trimEnv("HTTP_PROXY") ||
    null
  );
}

function getTelegramApiIps() {
  const raw = trimEnv("TELEGRAM_API_IPS");

  return raw
    ? raw.split(",").map((ip) => ip.trim()).filter(Boolean)
    : defaultTelegramApiIps;
}

function getPublicOrigin() {
  return (
    trimEnv("CURATOR_MINI_APP_SITE_URL") ||
    trimEnv("NEXT_PUBLIC_SITE_URL") ||
    "https://chintamanidhama.ru"
  ).replace(/\/$/, "");
}

function getReferralOrigin() {
  return (
    trimEnv("NEXT_PUBLIC_CHINTAMANI_SITE_URL") ||
    trimEnv("NEXT_PUBLIC_REFERRAL_SITE_URL") ||
    "https://chintamanidhama.ru"
  ).replace(/\/$/, "");
}

function getCuratorTelegramBotUsername() {
  return (
    trimEnv("CURATOR_TELEGRAM_BOT_USERNAME") ||
    trimEnv("NEXT_PUBLIC_CURATOR_TELEGRAM_BOT_USERNAME")
  );
}

function buildCuratorMiniAppUrl(nextPath = "/cabinet") {
  const url = new URL("/curator-mini-app", getPublicOrigin());

  url.searchParams.set("next", nextPath);

  return url.toString();
}

function buildReferralUrl(slug) {
  return `${getReferralOrigin()}/r/${encodeURIComponent(slug)}`;
}

function buildTelegramMiniAppReferralUrl(slug) {
  const botUsername = getCuratorTelegramBotUsername();

  return botUsername
    ? `https://t.me/${botUsername}?startapp=${encodeURIComponent(slug)}`
    : "";
}

function parseHttpStatus(rawResponse) {
  const [rawHeaders, body = ""] = rawResponse.split("\r\n\r\n");
  const statusLine = rawHeaders?.split("\r\n", 1)[0] ?? "";
  const match = statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/);

  if (!match) {
    throw new Error("Telegram proxy returned an invalid HTTP response");
  }

  const status = Number(match[1]);

  return {
    body: body.slice(0, 1000),
    ok: status >= 200 && status < 300,
    status,
    statusText: match[2] || ""
  };
}

async function postJsonViaHttpProxy(targetUrl, payload, proxyUrl) {
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
      const chunks = [];

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
      secureSocket.on("data", (chunk) => chunks.push(chunk));
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

async function postJsonViaTelegramIp(targetUrl, payload, ipAddress) {
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
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.once("end", () => {
          const status = response.statusCode ?? 0;

          resolve({
            body: Buffer.concat(chunks).toString("utf8").slice(0, 1000),
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

async function postTelegramJson(method, payload = {}) {
  const botToken = getBotToken();

  if (!botToken) {
    throw new Error("CURATOR_TELEGRAM_BOT_TOKEN is not configured");
  }

  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const proxyUrl = getTelegramProxyUrl();

  if (proxyUrl) {
    return postJsonViaHttpProxy(url, payload, proxyUrl);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    telegramRequestTimeoutMs
  );

  try {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST",
      signal: controller.signal
    });
    const body = await response.text().catch(() => "");

    return {
      body: body.slice(0, 1000),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    let lastError = error;

    for (const ipAddress of getTelegramApiIps()) {
      try {
        return await postJsonViaTelegramIp(url, payload, ipAddress);
      } catch (pinnedIpError) {
        lastError = pinnedIpError;
      }
    }

    throw lastError;
  } finally {
    clearTimeout(timeout);
  }
}

async function callTelegramMethod(method, payload = {}) {
  const response = await postTelegramJson(method, payload);

  if (!response.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status} ${response.statusText} ${response.body ?? ""}`.trim()
    );
  }

  const parsed = JSON.parse(response.body || "{}");

  if (!parsed.ok) {
    throw new Error(
      `Telegram ${method} returned ok=false: ${response.body ?? ""}`.trim()
    );
  }

  return parsed.result;
}

async function sendMessage(chatId, text, replyMarkup) {
  return callTelegramMethod("sendMessage", {
    chat_id: chatId,
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
    text
  });
}

async function answerCallbackQuery(callbackQueryId) {
  return callTelegramMethod("answerCallbackQuery", {
    callback_query_id: callbackQueryId
  });
}

async function removeReplyKeyboard(chatId) {
  return sendMessage(chatId, "Меню обновлено.", {
    remove_keyboard: true
  });
}

async function getCuratorByTelegramId(telegramId) {
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

function getPrimaryReferralSlug(curator) {
  return (
    curator.referralLinks.find((link) => link.isPrimary)?.slug ?? curator.slug
  );
}

function buildMenuKeyboard(mode = "web_app") {
  const clientsUrl = buildCuratorMiniAppUrl("/cabinet?section=clients");
  const cabinetUrl = buildCuratorMiniAppUrl("/cabinet");
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

async function sendMenuMessage(chatId, text) {
  await removeReplyKeyboard(chatId).catch((error) => {
    console.error("Curator polling bot reply keyboard removal failed", error);
  });

  try {
    await sendMessage(chatId, text, buildMenuKeyboard());
  } catch (error) {
    console.error(
      "Curator polling bot web_app menu failed, retrying with url buttons",
      error
    );
    await sendMessage(chatId, text, buildMenuKeyboard("url"));
  }
}

function formatMoney(amount, currency = "RUB") {
  return new Intl.NumberFormat("ru-RU", {
    currency,
    maximumFractionDigits: 0,
    style: "currency"
  }).format(amount);
}

async function buildStatsText(curator) {
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
  const waitingStatuses = new Set([
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

async function buildReferralText(curator) {
  const slug = getPrimaryReferralSlug(curator);
  const siteReferral = buildReferralUrl(slug);
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

async function handleAuthorizedCuratorMessage(chatId, from, command) {
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
    await sendMessage(chatId, await buildReferralText(curator));
    return;
  }

  await sendMenuMessage(
    chatId,
    `Здравствуйте, ${curator.name}. Выберите раздел:`
  );
}

async function handleTelegramUpdate(update) {
  if (update.callback_query) {
    const callback = update.callback_query;
    const chatId = callback.message?.chat.id;

    await answerCallbackQuery(callback.id).catch((error) => {
      console.error("Curator polling bot callback answer failed", error);
    });

    if (chatId) {
      await handleAuthorizedCuratorMessage(
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

    console.log("Curator polling bot message received", {
      chatId: message.chat.id,
      command,
      fromId: message.from.id,
      text
    });

    await handleAuthorizedCuratorMessage(
      message.chat.id,
      message.from,
      command
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getUpdates() {
  return callTelegramMethod("getUpdates", {
    allowed_updates: ["message", "callback_query"],
    offset: updateOffset || undefined,
    timeout: 50
  });
}

async function pollingLoop() {
  await callTelegramMethod("deleteWebhook", {
    drop_pending_updates: false
  });
  console.log("Curator polling bot started");

  while (true) {
    try {
      const updates = await getUpdates();

      for (const update of updates) {
        updateOffset = Math.max(updateOffset, update.update_id + 1);

        try {
          await handleTelegramUpdate(update);
        } catch (error) {
          console.error("Curator polling bot update failed", error);
        }
      }
    } catch (error) {
      console.error("Curator polling bot loop failed", error);
      await sleep(5000);
    }
  }
}

process.on("unhandledRejection", (error) => {
  console.error("Curator polling bot unhandled rejection", error);
});

process.on("uncaughtException", (error) => {
  console.error("Curator polling bot uncaught exception", error);
});

if (!getBotToken()) {
  console.log("Curator polling bot skipped: token is not configured");
} else if (trimEnv("CURATOR_TELEGRAM_POLLING_DISABLED") === "1") {
  console.log("Curator polling bot skipped: polling is disabled");
} else {
  await pollingLoop();
}
