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
  if (status === "WAITING_PAYMENT_VERIFICATION") {
    return "ожидает проверки оплаты";
  }
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
    participantNames: participantNames.length
      ? participantNames
      : [order.customerName]
  };
}

function appendCommonLines(lines, order) {
  const { childRecordLines, optionLines, participantNames } =
    getMessageParts(order);

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
      ...optionLines.map(
        (option) => `- ${option.title}: ${formatPrice(option.priceRub)}`
      )
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

async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    throw new Error("Telegram admin bot env is not configured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), telegramTimeoutMs);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        body: JSON.stringify({
          chat_id: chatId,
          disable_web_page_preview: true,
          text: text.slice(0, 4096)
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal
      }
    );
    const body = await response.text();

    if (!response.ok) {
      throw new Error(
        `Telegram sendMessage HTTP ${response.status}: ${body.slice(0, 200)}`
      );
    }

    const parsed = JSON.parse(body || "{}");
    if (!parsed.ok) {
      throw new Error(`Telegram sendMessage ok=false: ${body.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

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

await prisma.$disconnect();
