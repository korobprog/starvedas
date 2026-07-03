import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import { UserRole } from "@prisma/client";

import { formatLocalizedPrice } from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import { getSiteUrlForSourceDomain } from "@/server/email/site-url";

const TELEGRAM_MESSAGE_LIMIT = 4096;
const DEFAULT_TELEGRAM_REQUEST_TIMEOUT_MS = 5000;
const defaultTelegramApiIps = ["149.154.167.220"];

type TelegramResponse = {
  body: string;
  ok: boolean;
  status: number;
  statusText: string;
};

type OrderCreatedNotificationInput = {
  amountRub: number;
  childRecordLines?: string[];
  curatorName: string;
  customerEmail: string | null;
  customerComment?: string | null;
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
  receiptLabel?: string | null;
  receiptUrl?: string | null;
};

type ParticipantListNotificationInput = {
  body: string;
  curatorName: string;
  curatorTelegramId: string | null;
  listId: string;
  orderNumber: number;
  senderName: string;
  senderRole: string;
};

type StatisticianParticipantWorkNotificationInput = {
  orderId: string;
};

type CuratorParticipantListNotificationInput = {
  orderId: string;
};

type ClientParticipantNamesProcessedNotificationInput = {
  chatId: string | null;
  customerName: string;
  orderNumber: number;
  orderUrl: string;
  participantCount: number;
  serviceTitle: string;
};

export async function sendParticipantListTelegramNotification(
  input: ParticipantListNotificationInput
) {
  const text = [
    "Сообщение по списку участников StarVedas",
    "",
    `Заказ: #${input.orderNumber}`,
    `Куратор: ${input.curatorName}`,
    `Отправитель: ${input.senderName}`,
    "",
    input.body
  ].join("\n");

  if (input.senderRole === "CURATOR") {
    return sendTelegramMessage(text);
  }

  if (input.curatorTelegramId) {
    return sendTelegramMessageToChat(input.curatorTelegramId, text);
  }

  return false;
}

export async function sendStatisticianParticipantWorkTelegramNotification(
  input: StatisticianParticipantWorkNotificationInput
) {
  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
      id: input.orderId
    },
    select: {
      createdAt: true,
      customerComment: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      id: true,
      orderNumber: true,
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          fullName: true,
          rowStatus: true
        }
      },
      service: {
        select: {
          title: true
        }
      },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: {
          titleSnapshot: true
        }
      },
      sourceDomain: true
    }
  });

  if (!order || !order.participants.length) {
    return false;
  }

  const statisticians = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      telegramId: true
    },
    where: {
      active: true,
      role: UserRole.STATISTICIAN,
      telegramId: { not: null }
    }
  });

  if (!statisticians.length) {
    return false;
  }

  const text = formatStatisticianParticipantWorkMessage(order);
  const replyMarkup = createStatisticianParticipantWorkKeyboard(order);
  const results = await Promise.allSettled(
    statisticians.map((statistician) =>
      sendTelegramMessageToChat(statistician.telegramId!, text, replyMarkup)
    )
  );

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Statistician Telegram notification failed", result.reason);
    }
  });

  return results.some((result) => result.status === "fulfilled");
}

export async function sendCuratorParticipantListTelegramNotification(
  input: CuratorParticipantListNotificationInput
) {
  const order = await getCuratorParticipantListOrderByOrderId(input.orderId);

  if (!order?.curator.telegramId || !order.participantList) {
    return false;
  }

  return sendTelegramMessageToChat(
    order.curator.telegramId,
    formatCuratorParticipantListSummaryMessage(order),
    createCuratorParticipantListSummaryKeyboard(order)
  );
}

export async function getCuratorParticipantListTelegramDetails({
  curatorTelegramId,
  listId
}: {
  curatorTelegramId: number | string;
  listId: string;
}) {
  const order = await getCuratorParticipantListOrderByListId({
    curatorTelegramId,
    listId
  });

  if (!order?.participantList) {
    return null;
  }

  return {
    orderNumber: order.orderNumber,
    replyMarkup: createCuratorParticipantListDetailsKeyboard(
      order.participantList.id
    ),
    text: formatCuratorParticipantListDetailsMessage(order)
  };
}

export function createCuratorParticipantListConfirmKeyboard(listId: string) {
  return {
    inline_keyboard: [
      [
        {
          callback_data: `cur_yes:${listId}`,
          text: "Да, скопировано"
        }
      ],
      [
        {
          callback_data: `cur_no:${listId}`,
          text: "Отмена"
        }
      ]
    ]
  };
}

export async function sendOrderCreatedTelegramNotification(
  input: OrderCreatedNotificationInput
) {
  return sendTelegramMessage(formatOrderCreatedMessage(input));
}

function formatChildRecordsSection(input: OrderCreatedNotificationInput) {
  if (!input.childRecordLines?.length) {
    return [];
  }

  return ["", "Дети:", ...input.childRecordLines];
}

function formatCustomerCommentSection(input: OrderCreatedNotificationInput) {
  const comment = input.customerComment?.trim();

  if (!comment) {
    return [];
  }

  return ["", "Пожелания / просьбы клиента:", comment];
}

function createStatisticianParticipantWorkKeyboard(order: {
  orderNumber: number;
  id: string;
  sourceDomain: string;
}) {
  const siteUrl = getSiteUrlForSourceDomain(order.sourceDomain);
  const nextPath = `/statistician#participant-list-${order.orderNumber}`;
  const cabinetUrl = new URL("/statistician-mini-app", siteUrl);

  cabinetUrl.searchParams.set("next", nextPath);

  return {
    inline_keyboard: [
      [
        {
          callback_data: `stat_done:${order.id}`,
          text: "Отметить все обработанными"
        }
      ],
      [
        {
          text: "Открыть в кабинете",
          url: cabinetUrl.toString()
        }
      ]
    ]
  };
}

function getCuratorParticipantListOrderByOrderId(orderId: string) {
  return prisma.order.findFirst({
    where: {
      deletedAt: null,
      id: orderId
    },
    select: curatorParticipantListOrderSelect
  });
}

function getCuratorParticipantListOrderByListId({
  curatorTelegramId,
  listId
}: {
  curatorTelegramId: number | string;
  listId: string;
}) {
  return prisma.order.findFirst({
    where: {
      deletedAt: null,
      curator: {
        active: true,
        telegramId: String(curatorTelegramId)
      },
      participantList: {
        id: listId
      }
    },
    select: curatorParticipantListOrderSelect
  });
}

const curatorParticipantListOrderSelect = {
  createdAt: true,
  curator: {
    select: {
      name: true,
      telegramId: true
    }
  },
  customerEmail: true,
  customerName: true,
  customerPhone: true,
  customerTelegram: true,
  orderNumber: true,
  participantList: {
    select: {
      id: true,
      status: true
    }
  },
  participants: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    select: {
      fullName: true
    }
  },
  payment: {
    select: {
      paidAt: true,
      receiptLabel: true,
      receiptUrl: true
    }
  },
  service: {
    select: {
      title: true
    }
  },
  serviceOptions: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      titleSnapshot: true
    }
  },
  sourceDomain: true
};

function createCuratorParticipantListSummaryKeyboard(order: {
  orderNumber: number;
  participantList: { id: string } | null;
  sourceDomain: string;
}) {
  const listId = order.participantList?.id;

  if (!listId) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        {
          callback_data: `cur_list:${listId}`,
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

function createCuratorParticipantListDetailsKeyboard(listId: string) {
  return {
    inline_keyboard: [
      [
        {
          callback_data: `cur_copy:${listId}`,
          text: "Скопировал"
        }
      ]
    ]
  };
}

function buildCuratorCabinetListUrl(order: {
  orderNumber: number;
  sourceDomain: string;
}) {
  const siteUrl = getSiteUrlForSourceDomain(order.sourceDomain);
  const cabinetUrl = new URL("/curator-mini-app", siteUrl);

  cabinetUrl.searchParams.set(
    "next",
    `/cabinet?section=lists#participant-list-${order.orderNumber}`
  );

  return cabinetUrl.toString();
}

function getCuratorParticipantListEventTitle(order: {
  service: { title: string };
  serviceOptions: Array<{ titleSnapshot: string }>;
}) {
  const options = order.serviceOptions.map((option) => option.titleSnapshot);

  if (!options.length) {
    return order.service.title;
  }

  return `${order.service.title}: ${options.join(", ")}`;
}

function formatCuratorParticipantListReceipt(order: {
  payment: { receiptLabel: string | null; receiptUrl: string | null } | null;
}) {
  if (!order.payment?.receiptUrl) {
    return "Чек: не прикреплен";
  }

  return `${order.payment.receiptLabel?.trim() || "Чек"}: ${
    order.payment.receiptUrl
  }`;
}

function formatCuratorParticipantListContacts(order: {
  customerEmail: string | null;
  customerPhone: string | null;
  customerTelegram: string | null;
}) {
  return (
    [order.customerTelegram, order.customerPhone, order.customerEmail]
      .filter(Boolean)
      .join(", ") || "не указаны"
  );
}

function formatCuratorParticipantListSummaryMessage(order: {
  createdAt: Date;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string | null;
  customerTelegram: string | null;
  orderNumber: number;
  participants: Array<{ fullName: string }>;
  payment: {
    paidAt: Date | null;
    receiptLabel: string | null;
    receiptUrl: string | null;
  } | null;
  service: { title: string };
  serviceOptions: Array<{ titleSnapshot: string }>;
}) {
  return [
    "Новый список для обработки",
    "",
    `Мероприятие: ${getCuratorParticipantListEventTitle(order)}`,
    `Заказ: #${order.orderNumber}`,
    `Имен: ${order.participants.length}`,
    `Время оплаты: ${(order.payment?.paidAt ?? order.createdAt).toLocaleString(
      "ru-RU"
    )}`,
    formatCuratorParticipantListReceipt(order),
    "",
    `Клиент: ${order.customerName}`,
    `Контакты: ${formatCuratorParticipantListContacts(order)}`
  ].join("\n");
}

function formatCuratorParticipantListDetailsMessage(order: {
  createdAt: Date;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string | null;
  customerTelegram: string | null;
  orderNumber: number;
  participants: Array<{ fullName: string }>;
  payment: {
    paidAt: Date | null;
    receiptLabel: string | null;
    receiptUrl: string | null;
  } | null;
  service: { title: string };
  serviceOptions: Array<{ titleSnapshot: string }>;
}) {
  const names = order.participants.map(
    (participant, index) => `${index + 1}. ${participant.fullName}`
  );

  return [
    "Список участников",
    "",
    `Мероприятие: ${getCuratorParticipantListEventTitle(order)}`,
    `Заказ: #${order.orderNumber}`,
    `Время оплаты: ${(order.payment?.paidAt ?? order.createdAt).toLocaleString(
      "ru-RU"
    )}`,
    formatCuratorParticipantListReceipt(order),
    "",
    `Клиент: ${order.customerName}`,
    `Контакты: ${formatCuratorParticipantListContacts(order)}`,
    "",
    "Имена:",
    ...(names.length ? names : ["нет имён"])
  ].join("\n");
}

function formatStatisticianParticipantWorkMessage(order: {
  createdAt: Date;
  customerComment: string | null;
  customerEmail: string | null;
  customerName: string;
  customerPhone: string | null;
  customerTelegram: string | null;
  orderNumber: number;
  participants: Array<{ fullName: string; rowStatus: string }>;
  service: { title: string };
  serviceOptions: Array<{ titleSnapshot: string }>;
}) {
  const unprocessed = order.participants.filter(
    (participant) => participant.rowStatus !== "CHECKED"
  );
  const names = (unprocessed.length ? unprocessed : order.participants).map(
    (participant, index) => `${index + 1}. ${participant.fullName}`
  );
  const options = order.serviceOptions.map((option) => option.titleSnapshot);
  const comment = order.customerComment?.trim();

  return [
    "Новые имена для статиста",
    "",
    `Заказ: #${order.orderNumber}`,
    `Заказчик: ${order.customerName}`,
    `Контакты: ${[
      order.customerTelegram,
      order.customerPhone,
      order.customerEmail
    ]
      .filter(Boolean)
      .join(", ") || "не указаны"}`,
    `Продукт: ${order.service.title}`,
    options.length ? `Тип / обряды: ${options.join(", ")}` : null,
    `Дата покупки: ${order.createdAt.toLocaleString("ru-RU")}`,
    "",
    "Имена:",
    ...names,
    comment ? "" : null,
    comment ? "Пожелания / просьбы клиента:" : null,
    comment || null,
    "",
    unprocessed.length
      ? `Статус: не обработано (${unprocessed.length})`
      : "Статус: уже обработано"
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export async function sendPaymentSucceededTelegramNotification(
  input: PaymentSucceededNotificationInput
) {
  return sendTelegramMessage(formatPaymentSucceededMessage(input));
}

export async function sendClientParticipantNamesProcessedTelegramNotification(
  input: ClientParticipantNamesProcessedNotificationInput
) {
  if (!input.chatId) {
    return false;
  }

  return sendTelegramMessageToChat(
    input.chatId,
    formatClientParticipantNamesProcessedMessage(input),
    createClientOrderKeyboard(input.orderUrl)
  );
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

export function formatOrderCreatedMessage(
  input: OrderCreatedNotificationInput
) {
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
    ...formatChildRecordsSection(input),
    ...formatSelectedOptions(input),
    "",
    `Заказчик: ${input.customerName}`,
    `Telegram: ${formatOptional(input.customerTelegram)}`,
    `Телефон: ${formatOptional(input.customerPhone)}`,
    `Email: ${formatOptional(input.customerEmail)}`,
    ...formatCustomerCommentSection(input)
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
    ...formatChildRecordsSection(input),
    ...formatSelectedOptions(input),
    ...formatReceipt(input),
    "",
    `Заказчик: ${input.customerName}`,
    `Telegram: ${formatOptional(input.customerTelegram)}`,
    `Телефон: ${formatOptional(input.customerPhone)}`,
    `Email: ${formatOptional(input.customerEmail)}`,
    ...formatCustomerCommentSection(input)
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function formatClientParticipantNamesProcessedMessage(
  input: Omit<ClientParticipantNamesProcessedNotificationInput, "chatId">
) {
  return [
    "✅ Имена обработаны",
    "",
    `${input.customerName}, статист завершил проверку списка участников.`,
    "",
    `Заказ: #${input.orderNumber}`,
    `Услуга: ${input.serviceTitle}`,
    `Участников: ${input.participantCount}`,
    "",
    `Открыть заказ: ${input.orderUrl}`
  ].join("\n");
}

function createClientOrderKeyboard(orderUrl: string) {
  return {
    inline_keyboard: [
      [
        {
          text: "Открыть заказ",
          url: orderUrl
        }
      ]
    ]
  };
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

function formatReceipt(input: PaymentSucceededNotificationInput) {
  if (!input.receiptUrl) {
    return [];
  }

  return [
    "",
    `${input.receiptLabel?.trim() || "Чек об оплате"}: ${input.receiptUrl}`
  ];
}

async function sendTelegramMessage(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return false;
  }

  await callTelegramSendMessage(botToken, chatId, text);

  return true;
}

async function sendTelegramMessageToChat(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  const botToken =
    process.env.CURATOR_TELEGRAM_BOT_TOKEN?.trim() ||
    process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!botToken || !chatId) {
    return false;
  }

  await callTelegramSendMessage(botToken, chatId, text, replyMarkup);

  return true;
}

async function callTelegramSendMessage(
  botToken: string,
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  const response = await postTelegramJson(botToken, "sendMessage", {
    chat_id: chatId,
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
    text: trimTelegramMessage(text)
  });

  if (!response.ok) {
    throw new Error(
      `Telegram sendMessage failed (${response.status} ${response.statusText}): ${response.body}`.trim()
    );
  }

  const parsed = JSON.parse(response.body || "{}") as { ok?: boolean };

  if (!parsed.ok) {
    throw new Error(
      `Telegram sendMessage returned ok=false: ${response.body}`.trim()
    );
  }
}

async function postTelegramJson(
  botToken: string,
  method: string,
  payload: Record<string, unknown>
) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const proxyUrl = getTelegramProxyUrl();

  if (proxyUrl) {
    return postJsonViaHttpProxy(url, payload, proxyUrl);
  }

  try {
    return await postJsonViaTelegramHost(url, payload);
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
  }
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

function getTelegramApiIps() {
  return (
    process.env.TELEGRAM_API_IPS?.split(",")
      .map((ip) => ip.trim())
      .filter(Boolean) ?? defaultTelegramApiIps
  );
}

function getTelegramRequestTimeoutMs() {
  const parsed = Number(
    process.env.TELEGRAM_NOTIFICATION_REQUEST_TIMEOUT_MS?.trim() ||
      process.env.TELEGRAM_REQUEST_TIMEOUT_MS?.trim()
  );

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_TELEGRAM_REQUEST_TIMEOUT_MS;
}

function parseHttpStatus(rawResponse: string): TelegramResponse {
  const [rawHeaders, body = ""] = rawResponse.split("\r\n\r\n");
  const statusLine = rawHeaders?.split("\r\n", 1)[0] ?? "";
  const match = statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/);

  if (!match) {
    throw new Error("Telegram proxy returned an invalid HTTP response");
  }

  const status = Number(match[1]);

  return {
    body: body.slice(0, 500),
    ok: status >= 200 && status < 300,
    status,
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
  const requestTimeoutMs = getTelegramRequestTimeoutMs();
  const targetPort = Number(target.port || 443);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settleResolve = (value: TelegramResponse) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    const settleReject = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    const headers: http.OutgoingHttpHeaders = {};

    if (proxy.username || proxy.password) {
      headers["Proxy-Authorization"] = `Basic ${Buffer.from(
        `${decodeURIComponent(proxy.username)}:${decodeURIComponent(
          proxy.password
        )}`
      ).toString("base64")}`;
    }

    const request = http.request({
      headers,
      host: proxy.hostname,
      method: "CONNECT",
      path: `${target.hostname}:${targetPort}`,
      port: proxyPort,
      timeout: requestTimeoutMs
    });

    request.once("connect", (response, socket, head) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        settleReject(
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

      secureSocket.setTimeout(requestTimeoutMs);
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
          settleResolve(
            parseHttpStatus(Buffer.concat(chunks).toString("utf8"))
          );
        } catch (error) {
          settleReject(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      });
      secureSocket.once("timeout", () => {
        secureSocket.destroy(new Error("Telegram proxy request timed out"));
      });
      secureSocket.once("error", (error) => {
        settleReject(error);
      });
    });
    request.once("timeout", () => {
      request.destroy(new Error("Telegram proxy CONNECT timed out"));
    });
    request.once("error", (error) => {
      settleReject(error);
    });
    request.end();
  });
}

async function postJsonViaTelegramIp(
  targetUrl: string,
  payload: Record<string, unknown>,
  ipAddress: string
) {
  return postJsonViaHttpsTarget(targetUrl, payload, {
    headers: {
      Host: new URL(targetUrl).hostname
    },
    hostname: ipAddress,
    servername: new URL(targetUrl).hostname
  });
}

async function postJsonViaTelegramHost(
  targetUrl: string,
  payload: Record<string, unknown>
) {
  const target = new URL(targetUrl);

  return postJsonViaHttpsTarget(targetUrl, payload, {
    hostname: target.hostname,
    servername: target.hostname
  });
}

async function postJsonViaHttpsTarget(
  targetUrl: string,
  payload: Record<string, unknown>,
  requestOptions: {
    headers?: Record<string, string>;
    hostname: string;
    servername: string;
  }
): Promise<TelegramResponse> {
  const target = new URL(targetUrl);
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settleResolve = (value: TelegramResponse) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    const settleReject = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    const request = https.request(
      {
        headers: {
          "Content-Type": "application/json",
          ...(requestOptions.headers ?? {})
        },
        hostname: requestOptions.hostname,
        method: "POST",
        path: `${target.pathname}${target.search}`,
        port: 443,
        servername: requestOptions.servername,
        timeout: getTelegramRequestTimeoutMs()
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.once("aborted", () => {
          settleReject(new Error("Telegram response aborted"));
        });
        response.once("error", (error) => {
          settleReject(error);
        });
        response.once("end", () => {
          const status = response.statusCode ?? 0;

          settleResolve({
            body: Buffer.concat(chunks).toString("utf8").slice(0, 500),
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage ?? ""
          });
        });
      }
    );

    request.once("timeout", () => {
      request.destroy(new Error("Telegram request timed out"));
    });
    request.once("error", (error) => {
      settleReject(error);
    });
    request.write(body);
    request.end();
  });
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
