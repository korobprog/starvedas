import https from "node:https";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const orderMin = Number(process.argv[2] || 76);
const orderMax = Number(process.argv[3] || orderMin);
const telegramTimeoutMs = Number(
  process.env.TELEGRAM_NOTIFICATION_REQUEST_TIMEOUT_MS ||
    process.env.TELEGRAM_REQUEST_TIMEOUT_MS ||
    15000
);

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value)} руб.`;
}

function formatOptional(value) {
  return value?.trim() || "не указан";
}

function formatStatus(status) {
  if (status === "PAID") return "оплачен";
  if (status === "WAITING_PAYMENT_VERIFICATION") return "ожидает проверки оплаты";
  if (status === "PENDING_PAYMENT") return "ожидает оплаты";
  return status;
}

function formatChildRecordLines(order) {
  return order.childRecords.map((record) => {
    const label =
      record.type === "UNBORN"
        ? order.service.shraddhaUnbornLabel || "Нерожденный ребенок"
        : order.service.shraddhaDeceasedChildLabel || "Умерший ребенок";

    return `${label} ${record.parentName} ${record.childCount}`;
  });
}

function getMessageParts(order) {
  const participantNames = order.participants
    .map((participant) => participant.fullName.trim())
    .filter(Boolean);
  const childRecordLines = formatChildRecordLines(order);
  const optionLines = order.serviceOptions.map((option) => ({
    priceRub: option.totalRubSnapshot,
    title: option.titleSnapshot
  }));

  return {
    childRecordLines,
    optionLines,
    participantNames: participantNames.length ? participantNames : [order.customerName]
  };
}

function appendCommonLines(lines, order) {
  const { childRecordLines, optionLines, participantNames } = getMessageParts(order);

  lines.push(
    `Куратор: ${order.curator.name}`,
    `Церемония: ${order.service.title}`,
    `Сумма: ${formatPrice(order.amountRub)}`,
    `Участников: ${order.participantCount}`,
    "Список участников:",
    participantNames.join("\n")
  );

  if (childRecordLines.length) {
    lines.push("", "Дети:", ...childRecordLines);
  }

  if (optionLines.length) {
    lines.push(
      "",
      "Выбранные обряды:",
      ...optionLines.map((option) => `- ${option.title}: ${formatPrice(option.priceRub)}`)
    );
  }

  lines.push(
    "",
    `Заказчик: ${order.customerName}`,
    `Telegram: ${formatOptional(order.customerTelegram)}`,
    `Телефон: ${formatOptional(order.customerPhone)}`,
    `Email: ${formatOptional(order.customerEmail)}`
  );

  const comment = order.customerComment?.trim();
  if (comment) {
    lines.push("", "Пожелания / просьбы клиента:", comment);
  }

  return lines;
}

function formatOrderMessage(order) {
  const lines = [
    "🔁 Повторная отправка пропущенного уведомления",
    "",
    "Новый заказ StarVedas",
    "",
    `Заказ: #${order.orderNumber}`,
    `Статус: ${formatStatus(order.status)}`
  ];

  return appendCommonLines(lines, order).join("\n");
}

function formatPaymentMessage(order) {
  const providerName =
    order.payment?.provider === "prodamus"
      ? "Prodamus"
      : order.payment?.provider || "платежная система";
  const lines = [
    "🔁 Повторная отправка пропущенного уведомления",
    "",
    "✅ Оплата получена StarVedas",
    "",
    `Заказ: #${order.orderNumber}`,
    "Статус: оплачен",
    `Платежная система: ${providerName}`
  ];

  if (order.payment?.paidAt) {
    lines.push(`Время оплаты: ${order.payment.paidAt.toLocaleString("ru-RU")}`);
  }

  return appendCommonLines(lines, order).join("\n");
}

function getTelegramApiBase() {
  const configured = process.env.TELEGRAM_API_BASE?.trim();

  return configured
    ? configured.replace(/\/+$/, "")
    : "https://api.telegram.org";
}

function getTelegramRelayToken() {
  return process.env.TELEGRAM_RELAY_TOKEN?.trim() || "";
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
  const apiBase = getTelegramApiBase();
  const viaRelay = apiBase !== "https://api.telegram.org";
  const url = `${apiBase}/bot${botToken}/${method}`;
  const target = new URL(url);
  const relayToken = getTelegramRelayToken();

  try {
    return await postJsonViaHttps(url, payload, {
      headers: relayToken ? { "x-relay-token": relayToken } : undefined,
      hostname: target.hostname,
      servername: target.hostname
    });
  } catch (error) {
    let lastError = error;

    // Пиннинг IP осмыслен только для самого api.telegram.org: адреса релея
    // мы не знаем и подменять их его же хостом нельзя.
    for (const ipAddress of viaRelay ? [] : getTelegramApiIps()) {
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

async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    throw new Error("Telegram admin bot env is not configured");
  }

  const response = await postTelegramJson(botToken, "sendMessage", {
    chat_id: chatId,
    disable_web_page_preview: true,
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

try {
  const orders = await prisma.order.findMany({
    orderBy: { orderNumber: "asc" },
    select: {
      amountRub: true,
      childRecords: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { childCount: true, parentName: true, type: true }
      },
      curator: { select: { name: true } },
      customerComment: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      orderNumber: true,
      participantCount: true,
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { fullName: true }
      },
      payment: { select: { paidAt: true, provider: true, status: true } },
      service: {
        select: {
          shraddhaDeceasedChildLabel: true,
          shraddhaUnbornLabel: true,
          title: true
        }
      },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: { titleSnapshot: true, totalRubSnapshot: true }
      },
      status: true
    },
    where: {
      deletedAt: null,
      orderNumber: { gte: orderMin, lte: orderMax }
    }
  });

  if (!orders.length) {
    console.log("codex-telegram-resend: no orders found");
  } else {
    const sent = [];

    for (const order of orders) {
      await sendTelegramMessage(formatOrderMessage(order));
      sent.push(`#${order.orderNumber}:order`);

      if (
        order.status === "PAID" ||
        order.payment?.status === "SUCCEEDED" ||
        order.payment?.paidAt
      ) {
        await sendTelegramMessage(formatPaymentMessage(order));
        sent.push(`#${order.orderNumber}:payment`);
      }
    }

    console.log(`codex-telegram-resend: sent ${sent.join(",")}`);
  }
} catch (error) {
  console.error(
    "codex-telegram-resend failed",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}