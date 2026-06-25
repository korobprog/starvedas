import crypto from "node:crypto";
import { PaymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  allowedSourceDomains,
  normalizeSourceDomain,
  type SourceDomain
} from "@/server/source-domain";

export const accountingSheetTabs = [
  "Операции",
  "Возвраты",
  "Расходы",
  "Документы",
  "Дневная сводка",
  "Месячная сводка",
  "Лог синхронизации",
  "Настройки"
] as const;

export type AccountingSheetTab = (typeof accountingSheetTabs)[number];

export type AccountingReportStatus = "NEVER" | "SYNCING" | "OK" | "ERROR";

export const accountingSourceDomains = allowedSourceDomains;

export const accountingReportTitles: Record<SourceDomain, string> = {
  "chintamanidhama.ru": "Бухгалтерский отчет chintamanidhama.ru",
  "starvedas.ru": "Бухгалтерский отчет starvedas.ru"
};

const sheetsScopes = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive"
];

type GoogleCredentials = {
  clientEmail: string;
  privateKey: string;
};

type AccountingOperation = {
  amountRub: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  method: string;
  netAmountRub: number | null;
  operationDate: Date;
  orderId: string;
  orderNumber: number;
  paymentId: string;
  paymentStatus: string;
  providerPaymentId: string;
  receiptUrl: string;
  serviceTitle: string;
  sourceDomain: SourceDomain;
  status: string;
};

type AccountingTable = {
  range: string;
  values: Array<Array<string | number>>;
};

type GoogleApiError = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GoogleSpreadsheet = {
  sheets?: Array<{
    properties?: {
      title?: string;
    };
  }>;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
};

type GoogleBatchUpdateRequest = {
  addSheet: {
    properties: {
      title: string;
    };
  };
};

function getEnv(name: string) {
  return process.env[name]?.trim() || undefined;
}

export function getGoogleServiceAccountEmail() {
  const json = getEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

  if (json) {
    try {
      const parsed = JSON.parse(json.replace(/^'|'$/g, "")) as {
        client_email?: string;
      };

      if (parsed.client_email) {
        return parsed.client_email;
      }
    } catch {
      // The full credentials parser reports malformed JSON during API calls.
    }
  }

  return getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
}

function readServiceAccountCredentials(): GoogleCredentials {
  const json = getEnv("GOOGLE_SERVICE_ACCOUNT_JSON");

  if (json) {
    const parsed = JSON.parse(json.replace(/^'|'$/g, "")) as {
      client_email?: string;
      private_key?: string;
    };

    if (parsed.client_email && parsed.private_key) {
      return {
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n")
      };
    }
  }

  const clientEmail = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = getEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")?.replace(
    /\\n/g,
    "\n"
  );

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Не настроены GOOGLE_SERVICE_ACCOUNT_JSON или GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
  }

  return { clientEmail, privateKey };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function createServiceAccountJwt(credentials: GoogleCredentials) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const payload = {
    aud: "https://oauth2.googleapis.com/token",
    exp: nowSeconds + 3600,
    iat: nowSeconds,
    iss: credentials.clientEmail,
    scope: sheetsScopes.join(" ")
  };
  const unsignedJwt = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(payload)
  )}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(credentials.privateKey);

  return `${unsignedJwt}.${base64Url(signature)}`;
}

function googlePermissionHint(operation: string) {
  const serviceAccountEmail = getGoogleServiceAccountEmail();
  const accountHint = serviceAccountEmail ? ` (${serviceAccountEmail})` : "";

  if (operation === "create spreadsheet") {
    return `Проверьте права сервисного аккаунта${accountHint} на создание Google Sheets. Если в Google Workspace создание файлов для сервисных аккаунтов запрещено, создайте таблицу вручную, расшарьте ее сервисному аккаунту как Editor, сохраните ссылку на этой странице и повторите действие.`;
  }

  if (
    operation === "grant spreadsheet access" ||
    operation === "get spreadsheet" ||
    operation === "add missing sheets" ||
    operation === "clear spreadsheet values" ||
    operation === "update spreadsheet values"
  ) {
    return `Проверьте, что Google таблица расшарена сервисному аккаунту${accountHint} с правами Editor, а затем повторите действие.`;
  }

  return "";
}

async function getGoogleAccessToken() {
  const credentials = readServiceAccountCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      assertion: createServiceAccountJwt(credentials),
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer"
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    method: "POST"
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | GoogleApiError
      | null;

    throw new Error(
      error?.error?.message ??
        `Google OAuth error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("Google OAuth не вернул access_token");
  }

  return data.access_token;
}

async function googleApi<T>(
  url: string,
  init: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
    operation?: string;
  } = {}
) {
  const token = await getGoogleAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | GoogleApiError
      | null;

    const operation = init.operation ?? `${init.method ?? "GET"} ${new URL(url).pathname}`;
    const message = error?.error?.message ?? response.statusText;
    const hint = response.status === 403 ? googlePermissionHint(operation) : "";

    throw new Error(
      `Google API ${operation} failed (${response.status}): ${message}${hint ? `. ${hint}` : ""}`
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function spreadsheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

function parseSpreadsheetId(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

  if (match?.[1]) {
    return match[1];
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  throw new Error("Введите корректную ссылку или ID Google таблицы");
}

function range(tab: AccountingSheetTab, cell = "A1") {
  return `'${tab.replaceAll("'", "''")}'!${cell}`;
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toIsoDateTime(value: Date | null | undefined) {
  return value ? value.toISOString() : "";
}

function humanPaymentStatus(status: string) {
  switch (status) {
    case "SUCCEEDED":
      return "оплачено";
    case "REFUNDED":
      return "возврат";
    case "FAILED":
      return "ошибка";
    case "CANCELLED":
      return "отмена";
    case "AWAITING_VERIFICATION":
      return "ожидает проверки";
    case "PENDING":
      return "ожидает оплаты";
    default:
      return status.toLowerCase();
  }
}

function signedAmount(operation: AccountingOperation) {
  if (operation.paymentStatus === PaymentStatus.REFUNDED) {
    return -operation.amountRub;
  }

  if (operation.paymentStatus === PaymentStatus.SUCCEEDED) {
    return operation.amountRub;
  }

  return 0;
}

function collectOperations(
  orders: Array<
    Prisma.OrderGetPayload<{
      include: {
        payment: true;
        service: true;
        serviceOptions: true;
      };
    }>
  >,
  sourceDomain: SourceDomain
): AccountingOperation[] {
  return orders.map((order) => {
    const payment = order.payment;
    const options = order.serviceOptions
      .map((option) => option.titleSnapshot)
      .filter(Boolean)
      .join(", ");
    const paymentStatus = payment?.status ?? "NO_PAYMENT";

    return {
      amountRub: payment?.amountRub ?? order.amountRub,
      currency: payment?.currency ?? order.currency,
      customerEmail: order.customerEmail ?? "",
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? "",
      method: payment?.provider ?? "не указан",
      netAmountRub: null,
      operationDate: payment?.paidAt ?? payment?.createdAt ?? order.createdAt,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: payment?.id ?? "",
      paymentStatus,
      providerPaymentId: payment?.providerPaymentId ?? "",
      receiptUrl: payment?.receiptUrl ?? "",
      serviceTitle: options
        ? `${order.service.title}; ${options}`
        : order.service.title,
      sourceDomain,
      status: payment ? humanPaymentStatus(paymentStatus) : "платеж не создан"
    };
  });
}

function groupSummary(operations: AccountingOperation[], mode: "day" | "month") {
  const map = new Map<
    string,
    { count: number; paid: number; refunded: number; pending: number; net: number }
  >();

  for (const operation of operations) {
    const key =
      mode === "day"
        ? toIsoDate(operation.operationDate)
        : toIsoDate(operation.operationDate).slice(0, 7);
    const current = map.get(key) ?? {
      count: 0,
      net: 0,
      paid: 0,
      pending: 0,
      refunded: 0
    };
    const signed = signedAmount(operation);

    current.count += 1;
    current.net += signed;

    if (operation.paymentStatus === PaymentStatus.SUCCEEDED) {
      current.paid += operation.amountRub;
    } else if (operation.paymentStatus === PaymentStatus.REFUNDED) {
      current.refunded += operation.amountRub;
    } else {
      current.pending += operation.amountRub;
    }

    map.set(key, current);
  }

  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, values]) => [
      period,
      values.count,
      values.paid,
      values.refunded,
      values.pending,
      values.net
    ]);
}

function buildSheetTables(params: {
  logs: Awaited<ReturnType<typeof getRecentAccountingLogs>>;
  operations: AccountingOperation[];
  report: Awaited<ReturnType<typeof ensureAccountingReport>>;
  sourceDomain: SourceDomain;
}): AccountingTable[] {
  const { logs, operations, report, sourceDomain } = params;
  const now = new Date();
  const firstOperation = operations[0]?.operationDate;
  const lastOperation = operations.at(-1)?.operationDate;
  const operationRows = operations.map((operation) => [
    toIsoDateTime(operation.operationDate),
    operation.orderNumber,
    operation.paymentId,
    operation.providerPaymentId,
    operation.sourceDomain,
    operation.customerName,
    operation.customerEmail,
    operation.customerPhone,
    operation.serviceTitle,
    operation.amountRub,
    operation.currency,
    operation.method,
    "",
    operation.netAmountRub ?? "",
    operation.status,
    operation.receiptUrl,
    `/admin/participants?order=${operation.orderId}`
  ]);

  return [
    {
      range: range("Операции"),
      values: [
        [
          "Дата операции",
          "Номер заказа",
          "ID платежа",
          "ID платежа у провайдера",
          "Сайт-источник",
          "Клиент",
          "Email",
          "Телефон",
          "Услуга / пакет",
          "Сумма",
          "Валюта",
          "Способ оплаты",
          "Комиссия",
          "Чистая сумма",
          "Статус",
          "Чек / документ",
          "Ссылка в админке"
        ],
        ...operationRows
      ]
    },
    {
      range: range("Возвраты"),
      values: [
        [
          "Дата операции",
          "Номер заказа",
          "ID платежа",
          "Сайт-источник",
          "Клиент",
          "Сумма возврата",
          "Валюта",
          "Статус"
        ],
        ...operations
          .filter((operation) => operation.paymentStatus === PaymentStatus.REFUNDED)
          .map((operation) => [
            toIsoDateTime(operation.operationDate),
            operation.orderNumber,
            operation.paymentId,
            operation.sourceDomain,
            operation.customerName,
            operation.amountRub,
            operation.currency,
            operation.status
          ])
      ]
    },
    {
      range: range("Расходы"),
      values: [["Дата", "Статья", "Сумма", "Валюта", "Комментарий"]]
    },
    {
      range: range("Документы"),
      values: [
        ["Дата", "Номер заказа", "Тип документа", "Ссылка"],
        ...operations
          .filter((operation) => operation.receiptUrl)
          .map((operation) => [
            toIsoDateTime(operation.operationDate),
            operation.orderNumber,
            "Чек",
            operation.receiptUrl
          ])
      ]
    },
    {
      range: range("Дневная сводка"),
      values: [
        [
          "День",
          "Операций",
          "Оплачено",
          "Возвраты",
          "Ожидает / прочее",
          "Итого"
        ],
        ...groupSummary(operations, "day")
      ]
    },
    {
      range: range("Месячная сводка"),
      values: [
        [
          "Месяц",
          "Операций",
          "Оплачено",
          "Возвраты",
          "Ожидает / прочее",
          "Итого"
        ],
        ...groupSummary(operations, "month")
      ]
    },
    {
      range: range("Лог синхронизации"),
      values: [
        [
          "Старт",
          "Финиш",
          "Сайт",
          "Статус",
          "Операций",
          "Добавлено строк",
          "Обновлено строк",
          "Сообщение"
        ],
        ...logs.map((log) => [
          toIsoDateTime(log.startedAt),
          toIsoDateTime(log.finishedAt),
          log.sourceDomain,
          log.status,
          log.operationCount,
          log.rowsAdded,
          log.rowsUpdated,
          log.message ?? ""
        ])
      ]
    },
    {
      range: range("Настройки"),
      values: [
        ["Параметр", "Значение"],
        ["Сайт", sourceDomain],
        ["Отчет", accountingReportTitles[sourceDomain]],
        ["ID таблицы", report.spreadsheetId ?? ""],
        ["Email бухгалтера", report.accountantEmail ?? ""],
        ["Последняя синхронизация", toIsoDateTime(now)],
        ["Начало периода", firstOperation ? toIsoDateTime(firstOperation) : ""],
        ["Конец периода", lastOperation ? toIsoDateTime(lastOperation) : ""],
        ["Операций", operations.length],
        [
          "Важно",
          "Основное хранилище — база сайта. Google Sheets является отчетной витриной."
        ]
      ]
    }
  ];
}

async function createSpreadsheet(sourceDomain: SourceDomain) {
  const response = await googleApi<GoogleSpreadsheet>(
    "https://sheets.googleapis.com/v4/spreadsheets",
    {
      body: JSON.stringify({
        properties: {
          title: accountingReportTitles[sourceDomain]
        },
        sheets: accountingSheetTabs.map((tab) => ({
          properties: {
            title: tab
          }
        }))
      }),
      method: "POST",
      operation: "create spreadsheet"
    }
  );
  const spreadsheetId = response.spreadsheetId;

  if (!spreadsheetId) {
    throw new Error("Google Sheets API не вернул ID таблицы");
  }

  return {
    spreadsheetId,
    spreadsheetUrl: response.spreadsheetUrl ?? spreadsheetUrl(spreadsheetId)
  };
}

async function ensureSpreadsheetTabs(spreadsheetId: string) {
  const spreadsheet = await googleApi<GoogleSpreadsheet>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    { operation: "get spreadsheet" }
  );
  const existingTitles = new Set(
    spreadsheet.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? []
  );
  const requests: GoogleBatchUpdateRequest[] = accountingSheetTabs
    .filter((tab) => !existingTitles.has(tab))
    .map((tab) => ({
      addSheet: {
        properties: {
          title: tab
        }
      }
    }));

  if (requests.length > 0) {
    await googleApi(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        body: JSON.stringify({ requests }),
        method: "POST",
        operation: "add missing sheets"
      }
    );
  }
}

async function writeSpreadsheet(params: {
  logs: Awaited<ReturnType<typeof getRecentAccountingLogs>>;
  operations: AccountingOperation[];
  report: Awaited<ReturnType<typeof ensureAccountingReport>>;
  sourceDomain: SourceDomain;
  spreadsheetId: string;
}) {
  const tables = buildSheetTables(params);

  await ensureSpreadsheetTabs(params.spreadsheetId);
  await googleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values:batchClear`,
    {
      body: JSON.stringify({
        ranges: accountingSheetTabs.map((tab) => range(tab, "A:Z"))
      }),
      method: "POST",
      operation: "clear spreadsheet values"
    }
  );
  await googleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values:batchUpdate`,
    {
      body: JSON.stringify({
        data: tables,
        valueInputOption: "USER_ENTERED"
      }),
      method: "POST",
      operation: "update spreadsheet values"
    }
  );
}

async function grantAccountantAccess(params: {
  email: string;
  spreadsheetId: string;
}) {
  await googleApi(
    `https://www.googleapis.com/drive/v3/files/${params.spreadsheetId}/permissions?sendNotificationEmail=true`,
    {
      body: JSON.stringify({
        emailAddress: params.email,
        role: "reader",
        type: "user"
      }),
      method: "POST",
      operation: "grant spreadsheet access"
    }
  );
}

export async function ensureAccountingReport(sourceDomain: SourceDomain) {
  return prisma.accountingReport.upsert({
    where: { sourceDomain },
    create: {
      sourceDomain
    },
    update: {}
  });
}

export async function ensureAccountingReports() {
  return Promise.all(accountingSourceDomains.map(ensureAccountingReport));
}

export async function getRecentAccountingLogs(sourceDomain: SourceDomain) {
  return prisma.accountingSyncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
    where: { sourceDomain }
  });
}

export async function getAccountingDashboard() {
  const reports = await ensureAccountingReports();
  const logsByDomain = await Promise.all(
    reports.map((report) => getRecentAccountingLogs(report.sourceDomain as SourceDomain))
  );

  return reports.map((report, index) => ({
    ...report,
    logs: logsByDomain[index] ?? [],
    sourceDomain: normalizeSourceDomain(report.sourceDomain)
  }));
}

async function getAccountingOrders(sourceDomain: SourceDomain) {
  return prisma.order.findMany({
    include: {
      payment: true,
      service: true,
      serviceOptions: {
        orderBy: { sortOrder: "asc" }
      }
    },
    orderBy: [{ createdAt: "asc" }, { orderNumber: "asc" }],
    where: { sourceDomain }
  });
}

export async function syncAccountingReport(sourceDomainInput: string) {
  const sourceDomain = normalizeSourceDomain(sourceDomainInput);
  const startedAt = new Date();
  let report = await ensureAccountingReport(sourceDomain);
  let log = await prisma.accountingSyncLog.create({
    data: {
      reportId: report.id,
      sourceDomain,
      status: "SYNCING",
      startedAt
    }
  });

  await prisma.accountingReport.update({
    data: {
      lastSyncError: null,
      lastSyncStatus: "SYNCING"
    },
    where: { id: report.id }
  });

  try {
    if (!report.spreadsheetId) {
      const created = await createSpreadsheet(sourceDomain);

      report = await prisma.accountingReport.update({
        data: created,
        where: { id: report.id }
      });
    }

    const orders = await getAccountingOrders(sourceDomain);
    const operations = collectOperations(orders, sourceDomain);
    const logs = await getRecentAccountingLogs(sourceDomain);
    const spreadsheetId = report.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error("Не удалось определить ID Google таблицы");
    }

    await writeSpreadsheet({
      logs,
      operations,
      report,
      sourceDomain,
      spreadsheetId
    });

    if (report.accountantEmail) {
      await grantAccountantAccess({
        email: report.accountantEmail,
        spreadsheetId
      });
    }

    const firstOperation = operations[0]?.operationDate ?? null;
    const lastOperation = operations.at(-1)?.operationDate ?? null;
    const finishedAt = new Date();

    report = await prisma.accountingReport.update({
      data: {
        lastSyncedAt: finishedAt,
        lastSyncedPeriodEnd: lastOperation,
        lastSyncedPeriodStart: firstOperation,
        lastSyncError: null,
        lastSyncStatus: "OK",
        operationCount: operations.length,
        spreadsheetUrl: report.spreadsheetUrl ?? spreadsheetUrl(spreadsheetId)
      },
      where: { id: report.id }
    });
    log = await prisma.accountingSyncLog.update({
      data: {
        finishedAt,
        message: "Отчет успешно синхронизирован",
        operationCount: operations.length,
        rowsAdded: operations.length,
        rowsUpdated: 0,
        status: "OK"
      },
      where: { id: log.id }
    });

    return { log, report };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    const finishedAt = new Date();

    report = await prisma.accountingReport.update({
      data: {
        lastSyncedAt: finishedAt,
        lastSyncError: message,
        lastSyncStatus: "ERROR"
      },
      where: { id: report.id }
    });
    log = await prisma.accountingSyncLog.update({
      data: {
        finishedAt,
        message,
        status: "ERROR"
      },
      where: { id: log.id }
    });

    throw error;
  }
}

export async function updateAccountantEmail(params: {
  email: string | null;
  sourceDomain: string;
}) {
  const sourceDomain = normalizeSourceDomain(params.sourceDomain);
  const email = params.email?.trim() || null;
  const report = await ensureAccountingReport(sourceDomain);
  const updated = await prisma.accountingReport.update({
    data: {
      accountantEmail: email
    },
    where: { id: report.id }
  });

  if (email && updated.spreadsheetId) {
    try {
      await grantAccountantAccess({
        email,
        spreadsheetId: updated.spreadsheetId
      });

      return prisma.accountingReport.update({
        data: {
          lastSyncError: null
        },
        where: { id: updated.id }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка Google API";

      return prisma.accountingReport.update({
        data: {
          lastSyncedAt: new Date(),
          lastSyncError: message,
          lastSyncStatus: "ERROR"
        },
        where: { id: updated.id }
      });
    }
  }

  return updated;
}

export async function updateAccountingSpreadsheet(params: {
  sourceDomain: string;
  spreadsheet: string | null;
}) {
  const sourceDomain = normalizeSourceDomain(params.sourceDomain);
  const spreadsheetId = parseSpreadsheetId(params.spreadsheet);
  const report = await ensureAccountingReport(sourceDomain);

  return prisma.accountingReport.update({
    data: {
      lastSyncError: null,
      spreadsheetId,
      spreadsheetUrl: spreadsheetId ? spreadsheetUrl(spreadsheetId) : null
    },
    where: { id: report.id }
  });
}
