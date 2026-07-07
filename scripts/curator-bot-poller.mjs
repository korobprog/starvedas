import http from "node:http";
import https from "node:https";
import tls from "node:tls";
import {
  PrismaClient,
  OrderStatus,
  ParticipantListClaimRole,
  ParticipantListStatus,
  ParticipantRowStatus,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();
const defaultTelegramLongPollingTimeoutSeconds = 20;
const telegramLongPollingTimeoutSeconds =
  getTelegramLongPollingTimeoutSeconds();
const telegramRequestTimeoutMs = getTelegramRequestTimeoutMs();
const defaultTelegramApiIps = ["149.154.167.220"];

let updateOffset = 0;

function trimEnv(name) {
  return process.env[name]?.trim() || "";
}

function getTelegramRequestTimeoutMs() {
  const raw =
    trimEnv("CURATOR_TELEGRAM_REQUEST_TIMEOUT_MS") ||
    trimEnv("TELEGRAM_REQUEST_TIMEOUT_MS");
  const parsed = Number(raw);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return (telegramLongPollingTimeoutSeconds + 25) * 1000;
}

function getTelegramLongPollingTimeoutSeconds() {
  const raw =
    trimEnv("CURATOR_TELEGRAM_LONG_POLLING_TIMEOUT_SECONDS") ||
    trimEnv("TELEGRAM_LONG_POLLING_TIMEOUT_SECONDS");
  const parsed = Number(raw);

  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.min(Math.floor(parsed), 50);
  }

  return defaultTelegramLongPollingTimeoutSeconds;
}

function isTelegramTimeoutError(error) {
  return error instanceof Error && /timed out/i.test(error.message);
}

function getBotToken() {
  return trimEnv("CURATOR_TELEGRAM_BOT_TOKEN") || trimEnv("TELEGRAM_BOT_TOKEN");
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
    ? raw
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean)
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
    body,
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
    let settled = false;
    const settleResolve = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    const settleReject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };
    const headers = {};

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
      timeout: telegramRequestTimeoutMs
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
          settleResolve(
            parseHttpStatus(Buffer.concat(chunks).toString("utf8"))
          );
        } catch (error) {
          settleReject(error);
        }
      });
      secureSocket.once("timeout", () => {
        secureSocket.destroy(new Error("Telegram proxy request timed out"));
      });
      secureSocket.once("error", settleReject);
    });
    request.once("timeout", () => {
      request.destroy(new Error("Telegram proxy CONNECT timed out"));
    });
    request.once("error", settleReject);
    request.end();
  });
}

async function postJsonViaTelegramIp(targetUrl, payload, ipAddress) {
  return postJsonViaHttpsTarget(targetUrl, payload, {
    headers: {
      Host: new URL(targetUrl).hostname
    },
    hostname: ipAddress,
    servername: new URL(targetUrl).hostname
  });
}

async function postJsonViaTelegramHost(targetUrl, payload) {
  const target = new URL(targetUrl);

  return postJsonViaHttpsTarget(targetUrl, payload, {
    hostname: target.hostname,
    servername: target.hostname
  });
}

async function postJsonViaHttpsTarget(targetUrl, payload, requestOptions) {
  const target = new URL(targetUrl);
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      callback(value);
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
        timeout: telegramRequestTimeoutMs
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.once("aborted", () => {
          settle(reject, new Error("Telegram response aborted"));
        });
        response.once("error", (error) => {
          settle(reject, error);
        });
        response.once("end", () => {
          const status = response.statusCode ?? 0;

          settle(resolve, {
            body: Buffer.concat(chunks).toString("utf8"),
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
      settle(reject, error);
    });
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
  let proxyError = null;

  if (proxyUrl) {
    try {
      return await postJsonViaHttpProxy(url, payload, proxyUrl);
    } catch (error) {
      proxyError = error;
      console.warn(
        "Curator polling bot Telegram proxy request failed; trying direct connection",
        error instanceof Error ? error.message : error
      );
    }
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

    if (proxyError) {
      throw new Error(
        `Telegram proxy failed (${proxyError instanceof Error ? proxyError.message : String(proxyError)}); direct fallback failed (${lastError instanceof Error ? lastError.message : String(lastError)})`
      );
    }

    throw lastError;
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

async function answerCallbackQuery(callbackQueryId, options = {}) {
  return callTelegramMethod("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    show_alert: options.showAlert,
    text: options.text
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
      slug: true,
      userId: true
    }
  });
}

async function markOrderParticipantListProcessedByTelegram({ orderId, telegramId }) {
  const statistician = await prisma.user.findFirst({
    where: {
      active: true,
      role: UserRole.STATISTICIAN,
      telegramId: String(telegramId)
    },
    select: { id: true, name: true }
  });

  if (!statistician) {
    return { ok: false, reason: "У вас нет доступа к обработке этих имён." };
  }

  const order = await prisma.order.findFirst({
    where: { deletedAt: null, id: orderId, status: OrderStatus.PAID },
    select: {
      id: true,
      orderNumber: true,
      participantList: { select: { id: true } },
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, rowStatus: true }
      }
    }
  });

  if (!order) {
    return { ok: false, reason: "Оплаченный заказ не найден." };
  }

  const participantsToProcess = order.participants.filter(
    (participant) => participant.rowStatus !== ParticipantRowStatus.CHECKED
  );

  if (!participantsToProcess.length) {
    return { ok: true, alreadyProcessed: true, count: 0, orderNumber: order.orderNumber };
  }

  await prisma.$transaction(async (tx) => {
    const participantList = order.participantList ||
      (await tx.participantList.create({
        data: { orderId: order.id },
        select: { id: true }
      }));

    await tx.orderParticipant.updateMany({
      data: { rowStatus: ParticipantRowStatus.CHECKED },
      where: { id: { in: participantsToProcess.map((participant) => participant.id) } }
    });

    await tx.participantList.update({
      data: { status: ParticipantListStatus.CHECKED },
      where: { id: participantList.id }
    });

    await tx.participantListChange.createMany({
      data: participantsToProcess.map((participant) => ({
        changedById: statistician.id,
        fieldName: `participant:${participant.id}:rowStatus`,
        fromValue: participant.rowStatus,
        listId: participantList.id,
        toValue: ParticipantRowStatus.CHECKED
      }))
    });
  });

  return {
    ok: true,
    alreadyProcessed: false,
    count: participantsToProcess.length,
    orderNumber: order.orderNumber
  };
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

function buildCuratorCabinetListUrl(order) {
  const url = new URL("/curator-mini-app", getPublicOrigin());

  url.searchParams.set(
    "next",
    `/cabinet?section=lists#participant-list-${order.orderNumber}`
  );

  return url.toString();
}

function createCuratorParticipantListConfirmKeyboard(listId) {
  return {
    inline_keyboard: [
      [{ callback_data: `cur_yes:${listId}`, text: "Да, скопировано" }],
      [{ callback_data: `cur_no:${listId}`, text: "Отмена" }]
    ]
  };
}

function getCuratorParticipantListEventTitle(order) {
  const options = order.serviceOptions.map((option) => option.titleSnapshot);

  return options.length
    ? `${order.service.title}: ${options.join(", ")}`
    : order.service.title;
}

function formatCuratorParticipantListContacts(order) {
  return (
    [order.customerTelegram, order.customerPhone, order.customerEmail]
      .filter(Boolean)
      .join(", ") || "не указаны"
  );
}

function formatCuratorParticipantListReceipt(order) {
  if (!order.payment?.receiptUrl) {
    return "Чек: не прикреплен";
  }

  return `${order.payment.receiptLabel?.trim() || "Чек"}: ${
    order.payment.receiptUrl
  }`;
}

function formatCuratorParticipantListDetailsMessage(order) {
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

async function getCuratorParticipantListTelegramDetails({ listId, telegramId }) {
  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
      curator: {
        active: true,
        telegramId: String(telegramId)
      },
      participantList: { id: listId }
    },
    select: {
      createdAt: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      orderNumber: true,
      participants: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { fullName: true }
      },
      payment: {
        select: {
          paidAt: true,
          receiptLabel: true,
          receiptUrl: true
        }
      },
      service: { select: { title: true } },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: { titleSnapshot: true }
      }
    }
  });

  if (!order) {
    return null;
  }

  return {
    orderNumber: order.orderNumber,
    replyMarkup: {
      inline_keyboard: [
        [{ callback_data: `cur_copy:${listId}`, text: "Скопировал" }],
        [
          {
            text: "Открыть в кабинете",
            url: buildCuratorCabinetListUrl(order)
          }
        ]
      ]
    },
    text: formatCuratorParticipantListDetailsMessage(order)
  };
}

async function claimParticipantListByCuratorForPolling({
  curatorId,
  listId,
  userId
}) {
  return prisma.$transaction(async (tx) => {
    const list = await tx.participantList.findUnique({
      where: { id: listId },
      select: {
        claimedAt: true,
        claimedByCuratorId: true,
        claimedByRole: true,
        claimedByUserId: true,
        copiedAt: true,
        id: true,
        order: {
          select: {
            curatorId: true,
            id: true,
            orderNumber: true,
            status: true
          }
        },
        status: true
      }
    });

    if (!list) {
      throw new Error("Список не найден");
    }

    if (list.order.status !== OrderStatus.PAID) {
      throw new Error("Список можно забрать только после оплаты заказа");
    }

    if (list.order.curatorId !== curatorId) {
      throw new Error("Этот список принадлежит другому куратору");
    }

    if (
      list.claimedByRole &&
      (list.claimedByRole !== ParticipantListClaimRole.CURATOR ||
        list.claimedByCuratorId !== curatorId)
    ) {
      throw new Error("Список уже забрал другой исполнитель");
    }

    if (
      list.claimedByRole === ParticipantListClaimRole.CURATOR &&
      list.claimedByCuratorId === curatorId &&
      list.copiedAt
    ) {
      return { alreadyClaimed: true, orderNumber: list.order.orderNumber };
    }

    const now = new Date();
    const nextData = {
      claimedAt: list.claimedAt ?? now,
      claimedByCuratorId: curatorId,
      claimedByRole: ParticipantListClaimRole.CURATOR,
      claimedByUserId: userId,
      copiedAt: now,
      status: ParticipantListStatus.IN_WORK
    };

    await tx.participantList.update({
      data: nextData,
      where: { id: list.id }
    });

    await tx.participantListChange.create({
      data: {
        changedById: userId,
        fieldName: "claimedByRole",
        fromValue: list.claimedByRole ?? "",
        listId: list.id,
        note: "Куратор подтвердил, что список скопирован",
        toValue: ParticipantListClaimRole.CURATOR
      }
    });

    return { alreadyClaimed: false, orderNumber: list.order.orderNumber };
  });
}

async function handleCuratorParticipantListCallback({ callback, chatId, data }) {
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
      listId,
      telegramId: callback.from.id
    });

    await answerCallbackQuery(callback.id, {
      showAlert: !details,
      text: details ? "Список открыт." : "Список не найден или недоступен."
    });

    if (details && chatId) {
      await sendMessage(chatId, details.text, details.replyMarkup);
    }
    return;
  }

  if (action === "cur_copy") {
    const details = await getCuratorParticipantListTelegramDetails({
      listId,
      telegramId: callback.from.id
    });

    await answerCallbackQuery(callback.id, {
      showAlert: !details,
      text: details
        ? "Подтвердите копирование."
        : "Список не найден или недоступен."
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
      const result = await claimParticipantListByCuratorForPolling({
        curatorId: curator.id,
        listId,
        userId: curator.userId || null
      });

      await answerCallbackQuery(callback.id, {
        text: result.alreadyClaimed
          ? "Список уже был в работе."
          : "Список взят в работу."
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
      });

      if (chatId) {
        await sendMessage(chatId, message);
      }
    }
    return;
  }

  if (action === "cur_no") {
    await answerCallbackQuery(callback.id, { text: "Отменено." });

    if (chatId) {
      await sendMessage(chatId, "Отменено. Список не изменен.");
    }
  }
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
    const data = callback.data || "";

    if (data.startsWith("stat_done:")) {
      const result = await markOrderParticipantListProcessedByTelegram({
        orderId: data.slice("stat_done:".length),
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
        console.error("Statistician polling bot callback answer failed", error);
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
    timeout: telegramLongPollingTimeoutSeconds
  });
}

async function deleteWebhookWithRetry() {
  while (true) {
    try {
      await callTelegramMethod("deleteWebhook", {
        drop_pending_updates: true
      });
      return;
    } catch (error) {
      console.error("Curator polling bot deleteWebhook failed", error);
      await sleep(5000);
    }
  }
}

async function pollingLoop() {
  await deleteWebhookWithRetry();
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
      if (isTelegramTimeoutError(error)) {
        console.warn(
          "Curator polling bot Telegram request timed out; retrying",
          error.message
        );
      } else {
        console.error("Curator polling bot loop failed", error);
      }
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
