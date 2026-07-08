import https from "node:https";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const orderMin = Number(process.argv[2] || 76);
const rawOrderMax = process.argv[3] ? Number(process.argv[3]) : null;
const orderMax = Number.isFinite(rawOrderMax) ? rawOrderMax : null;
const telegramTimeoutMs = Number(
  process.env.CURATOR_TELEGRAM_REQUEST_TIMEOUT_MS ||
    process.env.TELEGRAM_NOTIFICATION_REQUEST_TIMEOUT_MS ||
    process.env.TELEGRAM_REQUEST_TIMEOUT_MS ||
    15000
);

function assertValidRange() {
  if (!Number.isFinite(orderMin) || orderMin <= 0) {
    throw new Error("Minimum order number must be a positive number");
  }

  if (orderMax !== null && (!Number.isFinite(orderMax) || orderMax < orderMin)) {
    throw new Error("Maximum order number must be greater than or equal to minimum order number");
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function cleanUrl(value) {
  const trimmed = value?.trim();
  return trimmed ? trimTrailingSlash(trimmed) : null;
}

function normalizeSourceDomain(sourceDomain) {
  const normalized = sourceDomain?.trim().toLowerCase().replace(/^www\./, "");

  if (normalized === "chintamanidhama.ru") {
    return "chintamanidhama.ru";
  }

  return "starvedas.ru";
}

function getSiteUrlForSourceDomain(sourceDomain) {
  if (normalizeSourceDomain(sourceDomain) === "chintamanidhama.ru") {
    return (
      cleanUrl(process.env.NEXT_PUBLIC_REFERRAL_SITE_URL) ||
      cleanUrl(process.env.CURATOR_MINI_APP_SITE_URL) ||
      "https://chintamanidhama.ru"
    );
  }

  return cleanUrl(process.env.NEXT_PUBLIC_SITE_URL) || "https://starvedas.ru";
}

function formatAmountRub(amountRub) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amountRub)} ₽`;
}

function getParticipantNameLines(order) {
  const participantNames = order.participants
    .map((participant) => participant.fullName.trim())
    .filter(Boolean);

  return participantNames.length ? participantNames : [order.customerName];
}

function getEventTitle(order) {
  const options = order.serviceOptions.map((option) => option.titleSnapshot);

  if (!options.length) {
    return order.service.title;
  }

  return `${order.service.title}: ${options.join(", ")}`;
}

function getContactLines(order) {
  const contacts = [order.customerTelegram, order.customerPhone, order.customerEmail]
    .map((contact) => contact?.trim())
    .filter(Boolean);

  return contacts.length ? contacts : ["не указаны"];
}

function formatSummaryMessage(order) {
  return [
    "🔁 Повторная отправка пропущенного уведомления",
    "",
    "Новый список для обработки",
    "",
    `Заказ: #${order.orderNumber}`,
    `Сумма: ${formatAmountRub(order.amountRub)}`,
    `Мероприятие: ${getEventTitle(order)}`,
    `Имен: ${getParticipantNameLines(order).length}`,
    `Время оплаты: ${(order.payment?.paidAt ?? order.createdAt).toLocaleString("ru-RU")}`,
    "",
    `Клиент: ${order.customerName}`,
    "",
    "Контакты:",
    ...getContactLines(order)
  ].join("\n");
}

function formatNamesMessage(order) {
  return getParticipantNameLines(order).join("\n");
}

function buildCuratorCabinetListUrl(order) {
  const siteUrl = getSiteUrlForSourceDomain(order.sourceDomain);
  const cabinetUrl = new URL("/curator-mini-app", siteUrl);

  cabinetUrl.searchParams.set(
    "next",
    `/cabinet?section=lists#participant-list-${order.orderNumber}`
  );

  return cabinetUrl.toString();
}

function createSummaryKeyboard(order) {
  return {
    inline_keyboard: [
      [
        {
          callback_data: `cur_list:${order.participantList.id}`,
          text: "Открыть список"
        }
      ],
      [
        {
          text: "Открыть в кабинете",
          url: buildCuratorCabinetListUrl(order)
        }
      ]
    ]
  };
}

function getTelegramApiIps() {
  return (process.env.TELEGRAM_API_IPS || "149.154.167.220")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function postJsonViaHttps(targetUrl, payload, options) {
  const target = new URL(targetUrl);
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    const request = https.request(
      {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        hostname: options.hostname,
        method: "POST",
        path: `${target.pathname}${target.search}`,
        port: 443,
        servername: options.servername,
        timeout: telegramTimeoutMs
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.once("aborted", () => settle(reject, new Error("Telegram response aborted")));
        response.once("error", (error) => settle(reject, error));
        response.once("end", () => {
          const status = response.statusCode || 0;
          settle(resolve, {
            body: Buffer.concat(chunks).toString("utf8"),
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage || ""
          });
        });
      }
    );

    request.once("timeout", () => request.destroy(new Error("Telegram request timed out")));
    request.once("error", (error) => settle(reject, error));
    request.write(body);
    request.end();
  });
}

async function postTelegramJson(botToken, method, payload) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const target = new URL(url);

  try {
    return await postJsonViaHttps(url, payload, {
      hostname: target.hostname,
      servername: target.hostname
    });
  } catch (error) {
    let lastError = error;

    for (const ipAddress of getTelegramApiIps()) {
      try {
        return await postJsonViaHttps(url, payload, {
          headers: { Host: target.hostname },
          hostname: ipAddress,
          servername: target.hostname
        });
      } catch (pinnedIpError) {
        lastError = pinnedIpError;
      }
    }

    throw lastError;
  }
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const botToken =
    process.env.CURATOR_TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken) {
    throw new Error("CURATOR_TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await postTelegramJson(botToken, "sendMessage", {
    chat_id: chatId,
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
    text: text.slice(0, 4096)
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage HTTP ${response.status}: ${response.body.slice(0, 200)}`);
  }

  const parsed = JSON.parse(response.body || "{}");
  if (!parsed.ok) {
    throw new Error(`Telegram sendMessage ok=false: ${response.body.slice(0, 200)}`);
  }
}

function isPaidOrder(order) {
  return order.status === "PAID" || order.payment?.status === "SUCCEEDED" || Boolean(order.payment?.paidAt);
}

try {
  assertValidRange();

  const orders = await prisma.order.findMany({
    orderBy: { orderNumber: "asc" },
    select: {
      amountRub: true,
      createdAt: true,
      curator: { select: { name: true, telegramId: true } },
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      orderNumber: true,
      participantList: { select: { id: true } },
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { fullName: true }
      },
      payment: { select: { paidAt: true, status: true } },
      service: { select: { title: true } },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: { titleSnapshot: true }
      },
      sourceDomain: true,
      status: true
    },
    where: {
      deletedAt: null,
      orderNumber: {
        gte: orderMin,
        ...(orderMax === null ? {} : { lte: orderMax })
      }
    }
  });

  if (!orders.length) {
    console.log("codex-curator-telegram-resend: no orders found");
  } else {
    const sent = [];
    const skipped = [];

    for (const order of orders) {
      if (!isPaidOrder(order)) {
        skipped.push(`#${order.orderNumber}:not_paid`);
        continue;
      }

      if (!order.curator.telegramId) {
        skipped.push(`#${order.orderNumber}:no_curator_telegram_id`);
        continue;
      }

      if (!order.participantList) {
        skipped.push(`#${order.orderNumber}:no_participant_list`);
        continue;
      }

      await sendTelegramMessage(
        order.curator.telegramId,
        formatSummaryMessage(order),
        createSummaryKeyboard(order)
      );
      await sendTelegramMessage(order.curator.telegramId, formatNamesMessage(order));
      sent.push(`#${order.orderNumber}:${order.curator.name}`);
    }

    console.log(`codex-curator-telegram-resend: sent ${sent.length ? sent.join(",") : "none"}`);
    if (skipped.length) {
      console.log(`codex-curator-telegram-resend: skipped ${skipped.join(",")}`);
    }
  }
} catch (error) {
  console.error(
    "codex-curator-telegram-resend failed",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
