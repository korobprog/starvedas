import { google } from "googleapis";
import type { sheets_v4 } from "googleapis";
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
  "https://www.googleapis.com/auth/drive.file"
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

function getEnv(name: string) {
  return process.env[name]?.trim() || undefined;
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

function getGoogleClients() {
  const credentials = readServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: sheetsScopes
  });

  return {
    drive: google.drive({ auth, version: "v3" }),
    sheets: google.sheets({ auth, version: "v4" })
  };
}

function spreadsheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
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
  const { sheets } = getGoogleClients();
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: accountingReportTitles[sourceDomain]
      },
      sheets: accountingSheetTabs.map((tab) => ({
        properties: {
          title: tab
        }
      }))
    }
  });
  const spreadsheetId = response.data.spreadsheetId;

  if (!spreadsheetId) {
    throw new Error("Google Sheets API не вернул ID таблицы");
  }

  return {
    spreadsheetId,
    spreadsheetUrl: response.data.spreadsheetUrl ?? spreadsheetUrl(spreadsheetId)
  };
}

async function ensureSpreadsheetTabs(spreadsheetId: string) {
  const { sheets } = getGoogleClients();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set(
    spreadsheet.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? []
  );
  const requests: sheets_v4.Schema$Request[] = accountingSheetTabs
    .filter((tab) => !existingTitles.has(tab))
    .map((tab) => ({
      addSheet: {
        properties: {
          title: tab
        }
      }
    }));

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      requestBody: { requests },
      spreadsheetId
    });
  }
}

async function writeSpreadsheet(params: {
  logs: Awaited<ReturnType<typeof getRecentAccountingLogs>>;
  operations: AccountingOperation[];
  report: Awaited<ReturnType<typeof ensureAccountingReport>>;
  sourceDomain: SourceDomain;
  spreadsheetId: string;
}) {
  const { sheets } = getGoogleClients();
  const tables = buildSheetTables(params);

  await ensureSpreadsheetTabs(params.spreadsheetId);
  await sheets.spreadsheets.values.batchClear({
    requestBody: {
      ranges: accountingSheetTabs.map((tab) => range(tab, "A:Z"))
    },
    spreadsheetId: params.spreadsheetId
  });
  await sheets.spreadsheets.values.batchUpdate({
    requestBody: {
      data: tables,
      valueInputOption: "USER_ENTERED"
    },
    spreadsheetId: params.spreadsheetId
  });
}

async function grantAccountantAccess(params: {
  email: string;
  spreadsheetId: string;
}) {
  const { drive } = getGoogleClients();

  await drive.permissions.create({
    fileId: params.spreadsheetId,
    requestBody: {
      emailAddress: params.email,
      role: "reader",
      type: "user"
    },
    sendNotificationEmail: true
  });
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
    await grantAccountantAccess({
      email,
      spreadsheetId: updated.spreadsheetId
    });
  }

  return updated;
}
