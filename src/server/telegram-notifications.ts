import { formatLocalizedPrice } from "@/i18n/pricing";

const TELEGRAM_MESSAGE_LIMIT = 4096;
const TELEGRAM_REQUEST_TIMEOUT_MS = 5000;

type OrderCreatedNotificationInput = {
  amountRub: number;
  curatorName: string;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string | null;
  customerTelegram: string | null;
  orderNumber: number;
  participantCount: number;
  participantNames: string[];
  selectedOptions?: Array<{
    priceRub: number;
    title: string;
  }>;
  serviceTitle: string;
  sourceDomain?: string;
  statusText?: string;
  locale?: string | null;
};

type PaymentSucceededNotificationInput = OrderCreatedNotificationInput & {
  paidAt?: Date | null;
  paymentProviderName: string;
};

export async function sendOrderCreatedTelegramNotification(
  input: OrderCreatedNotificationInput
) {
  return sendTelegramMessage(formatOrderCreatedMessage(input));
}

export async function sendPaymentSucceededTelegramNotification(
  input: PaymentSucceededNotificationInput
) {
  return sendTelegramMessage(formatPaymentSucceededMessage(input));
}

export function isTelegramUserAllowed(
  userId: number | string | null | undefined
) {
  const actualUserId = String(userId ?? "").trim();

  return Boolean(
    actualUserId && getAllowedTelegramUserIds().includes(actualUserId)
  );
}

function getAllowedTelegramUserIds() {
  return [
    process.env.TELEGRAM_ALLOWED_USER_IDS,
    process.env.TELEGRAM_ALLOWED_USER_ID
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
}

function formatOrderCreatedMessage(input: OrderCreatedNotificationInput) {
  const localizedAmount = formatLocalizedPrice(input.amountRub, input.locale);

  return [
    "Новый заказ StarVedas",
    "",
    `Заказ: #${input.orderNumber}`,
    `Статус: ${input.statusText ?? "ожидает оплаты"}`,
    `Куратор: ${input.curatorName}`,
    `Церемония: ${input.serviceTitle}`,
    `Сумма: ${localizedAmount}`,
    `Участников: ${input.participantCount}`,
    "Список участников:",
    input.participantNames.join("\n"),
    ...formatSelectedOptions(input),
    "",
    `Заказчик: ${input.customerName}`,
    `Telegram: ${formatOptional(input.customerTelegram)}`,
    `Телефон: ${formatOptional(input.customerPhone)}`,
    `Email: ${formatOptional(input.customerEmail)}`
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatPaymentSucceededMessage(
  input: PaymentSucceededNotificationInput
) {
  const localizedAmount = formatLocalizedPrice(input.amountRub, input.locale);

  return [
    "✅ Оплата получена StarVedas",
    "",
    `Заказ: #${input.orderNumber}`,
    `Статус: оплачен`,
    `Платежная система: ${input.paymentProviderName}`,
    input.paidAt ? `Время оплаты: ${input.paidAt.toLocaleString("ru-RU")}` : "",
    `Куратор: ${input.curatorName}`,
    `Церемония: ${input.serviceTitle}`,
    `Сумма: ${localizedAmount}`,
    `Участников: ${input.participantCount}`,
    "Список участников:",
    input.participantNames.join("\n"),
    ...formatSelectedOptions(input),
    "",
    `Заказчик: ${input.customerName}`,
    `Telegram: ${formatOptional(input.customerTelegram)}`,
    `Телефон: ${formatOptional(input.customerPhone)}`,
    `Email: ${formatOptional(input.customerEmail)}`
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

function formatSelectedOptions(input: OrderCreatedNotificationInput) {
  if (!input.selectedOptions?.length) {
    return [];
  }

  return [
    "",
    "Выбранные обряды:",
    ...input.selectedOptions.map(
      (option) =>
        `- ${option.title}: ${formatLocalizedPrice(option.priceRub, input.locale)}`
    )
  ];
}

async function sendTelegramMessage(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TELEGRAM_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        body: JSON.stringify({
          chat_id: chatId,
          disable_web_page_preview: true,
          text: trimTelegramMessage(text)
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST",
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error("Telegram sendMessage failed");
    }

    return true;
  } finally {
    clearTimeout(timeout);
  }
}

function formatOptional(value: string | null) {
  return value?.trim() || "не указан";
}

function trimTelegramMessage(text: string) {
  if (text.length <= TELEGRAM_MESSAGE_LIMIT) {
    return text;
  }

  return `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 32)}\n\n...сообщение сокращено`;
}
