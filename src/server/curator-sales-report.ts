import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CuratorSalesSearchParams = Record<
  string,
  string | string[] | undefined
>;

type SearchParamsInput = CuratorSalesSearchParams | URLSearchParams | undefined;

export const curatorSalesStatusOptions = [
  OrderStatus.PAID,
  OrderStatus.REFUNDED,
  OrderStatus.WAITING_PAYMENT_VERIFICATION
] as const;

export type CuratorSalesStatusFilter =
  | (typeof curatorSalesStatusOptions)[number]
  | "ALL";

export type CuratorSalesFilters = {
  curatorId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  dateFrom: string;
  dateTo: string;
  optionQuery: string;
  referralSlug: string;
  serviceId: string;
  sourceDomain: string;
  status: CuratorSalesStatusFilter;
  usePeriod: boolean;
};

export type CuratorSalesReportRow = {
  amountRub: number;
  currency: string;
  curatorId: string;
  curatorName: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerTelegram: string;
  id: string;
  orderNumber: number;
  orderStatus: OrderStatus;
  partnerLabel: string;
  paymentStatus: string;
  referralLinkId: string;
  referralLinkTitleSnapshot: string;
  referralSlug: string;
  saleDate: Date;
  serviceId: string;
  serviceOptionsLabel: string;
  serviceTitle: string;
  sourceDomain: string;
};

export type CuratorSalesSummary = {
  curatorId: string;
  curatorName: string;
  customers: number;
  grossAmount: number;
  netAmount: number;
  partners: number;
  refundsAmount: number;
  refundsCount: number;
  salesCount: number;
};

export type ReferralSalesSummary = {
  curatorId: string;
  curatorName: string;
  customers: number;
  grossAmount: number;
  netAmount: number;
  partnerLabel: string;
  referralLinkId: string;
  referralSlug: string;
  refundsAmount: number;
  refundsCount: number;
  salesCount: number;
};

export type ProductSalesSummary = {
  curatorId: string;
  curatorName: string;
  grossAmount: number;
  serviceId: string;
  serviceTitle: string;
  salesCount: number;
};

export type MonthlySalesSummary = {
  customers: number;
  grossAmount: number;
  month: string;
  monthLabel: string;
  netAmount: number;
  refundsAmount: number;
  refundsCount: number;
  salesCount: number;
};

export type CuratorSalesReport = {
  filters: CuratorSalesFilters;
  filterOptions: {
    curators: Array<{ active: boolean; id: string; name: string }>;
    referralLinks: Array<{
      curatorName: string;
      isPrimary: boolean;
      slug: string;
      title: string | null;
    }>;
    services: Array<{ id: string; title: string }>;
  };
  monthlySummaries: MonthlySalesSummary[];
  productSummaries: ProductSalesSummary[];
  referralSummaries: ReferralSalesSummary[];
  rows: CuratorSalesReportRow[];
  stats: {
    curatorsCount: number;
    netAmount: number;
    referralSourcesCount: number;
    salesCount: number;
    uniqueCustomers: number;
  };
  summaries: CuratorSalesSummary[];
};

function firstParam(
  searchParams: SearchParamsInput,
  key: string
): string | undefined {
  if (!searchParams) {
    return undefined;
  }

  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key) ?? undefined;
  }

  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00.000`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    date.setDate(date.getDate() + 1);
  }

  return date;
}

function parseStatus(value: string | undefined): CuratorSalesStatusFilter {
  if (value === "ALL") {
    return "ALL";
  }

  return (
    curatorSalesStatusOptions.find((status) => status === value) ??
    OrderStatus.PAID
  );
}

export function parseCuratorSalesFilters(
  searchParams: SearchParamsInput
): CuratorSalesFilters {
  const dateFrom = clean(firstParam(searchParams, "dateFrom"));
  const dateTo = clean(firstParam(searchParams, "dateTo"));

  return {
    curatorId: clean(firstParam(searchParams, "curatorId")),
    customerEmail: clean(firstParam(searchParams, "customerEmail")),
    customerName: clean(firstParam(searchParams, "customerName")),
    customerPhone: clean(firstParam(searchParams, "customerPhone")),
    dateFrom,
    dateTo,
    optionQuery: clean(firstParam(searchParams, "optionQuery")),
    referralSlug: clean(firstParam(searchParams, "referralSlug")),
    serviceId: clean(firstParam(searchParams, "serviceId")),
    sourceDomain: clean(firstParam(searchParams, "sourceDomain")),
    status: parseStatus(firstParam(searchParams, "status")),
    usePeriod: firstParam(searchParams, "usePeriod") === "1"
  };
}

export function buildCuratorSalesWhere(filters: CuratorSalesFilters) {
  const createdAt: Prisma.DateTimeFilter = {};
  const from = parseDate(filters.dateFrom);
  const to = parseDate(filters.dateTo, true);

  if (filters.usePeriod && from) {
    createdAt.gte = from;
  }

  if (filters.usePeriod && to) {
    createdAt.lt = to;
  }

  return {
    curatorId: filters.curatorId || undefined,
    customerEmail: filters.customerEmail
      ? { contains: filters.customerEmail, mode: "insensitive" }
      : undefined,
    customerName: filters.customerName
      ? { contains: filters.customerName, mode: "insensitive" }
      : undefined,
    customerPhone: filters.customerPhone
      ? { contains: filters.customerPhone, mode: "insensitive" }
      : undefined,
    deletedAt: null,
    serviceId: filters.serviceId || undefined,
    serviceOptions: filters.optionQuery
      ? {
          some: {
            titleSnapshot: {
              contains: filters.optionQuery,
              mode: "insensitive"
            }
          }
        }
      : undefined,
    referralSlug: filters.referralSlug || undefined,
    sourceDomain: filters.sourceDomain || undefined,
    status: filters.status === "ALL" ? undefined : filters.status,
    createdAt: Object.keys(createdAt).length ? createdAt : undefined
  } satisfies Prisma.OrderWhereInput;
}

function getCustomerKey(
  row: Pick<
    CuratorSalesReportRow,
    "customerEmail" | "customerName" | "customerPhone"
  >
) {
  return (
    row.customerEmail ||
    row.customerPhone ||
    row.customerName
  ).toLocaleLowerCase("ru-RU");
}

function getPartnerKey(
  row: Pick<
    CuratorSalesReportRow,
    "partnerLabel" | "referralLinkId" | "referralSlug"
  >
) {
  return (
    row.referralLinkId || row.referralSlug || row.partnerLabel || "Без ссылки"
  );
}

function getSignedAmount(
  row: Pick<CuratorSalesReportRow, "amountRub" | "orderStatus">
) {
  if (row.orderStatus === OrderStatus.REFUNDED) {
    return -row.amountRub;
  }

  if (row.orderStatus === OrderStatus.PAID) {
    return row.amountRub;
  }

  return 0;
}

function getReferralLabel(link: {
  isPrimary: boolean;
  slug: string;
  title: string | null;
}) {
  return link.title?.trim() || (link.isPrimary ? "Основная ссылка" : link.slug);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Date(year, monthNumber - 1, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric"
  });

  return label.charAt(0).toLocaleUpperCase("ru-RU") + label.slice(1);
}

function pushToMap<T>(map: Map<string, T[]>, key: string, item: T) {
  const items = map.get(key) ?? [];
  items.push(item);
  map.set(key, items);
}

function countUniqueCustomers(rows: CuratorSalesReportRow[]) {
  return new Set(rows.map(getCustomerKey).filter(Boolean)).size;
}

function buildCuratorSummaries(rows: CuratorSalesReportRow[]) {
  const groups = new Map<string, CuratorSalesReportRow[]>();

  for (const row of rows) {
    pushToMap(groups, row.curatorId, row);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      const paidRows = group.filter(
        (row) => row.orderStatus === OrderStatus.PAID
      );
      const refundRows = group.filter(
        (row) => row.orderStatus === OrderStatus.REFUNDED
      );
      const refundsAmount = refundRows.reduce(
        (sum, row) => sum + row.amountRub,
        0
      );
      const grossAmount = paidRows.reduce((sum, row) => sum + row.amountRub, 0);

      return {
        curatorId: first.curatorId,
        curatorName: first.curatorName,
        customers: countUniqueCustomers(group),
        grossAmount,
        netAmount: grossAmount - refundsAmount,
        partners: new Set(group.map(getPartnerKey)).size,
        refundsAmount,
        refundsCount: refundRows.length,
        salesCount: paidRows.length
      } satisfies CuratorSalesSummary;
    })
    .sort(
      (a, b) =>
        b.netAmount - a.netAmount || a.curatorName.localeCompare(b.curatorName)
    );
}

function buildReferralSummaries(rows: CuratorSalesReportRow[]) {
  const groups = new Map<string, CuratorSalesReportRow[]>();

  for (const row of rows) {
    pushToMap(groups, `${row.curatorId}:${getPartnerKey(row)}`, row);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      const paidRows = group.filter(
        (row) => row.orderStatus === OrderStatus.PAID
      );
      const refundRows = group.filter(
        (row) => row.orderStatus === OrderStatus.REFUNDED
      );
      const refundsAmount = refundRows.reduce(
        (sum, row) => sum + row.amountRub,
        0
      );
      const grossAmount = paidRows.reduce((sum, row) => sum + row.amountRub, 0);

      return {
        curatorId: first.curatorId,
        curatorName: first.curatorName,
        customers: countUniqueCustomers(group),
        grossAmount,
        netAmount: grossAmount - refundsAmount,
        partnerLabel: first.partnerLabel,
        referralLinkId: first.referralLinkId,
        referralSlug: first.referralSlug,
        refundsAmount,
        refundsCount: refundRows.length,
        salesCount: paidRows.length
      } satisfies ReferralSalesSummary;
    })
    .sort(
      (a, b) =>
        b.netAmount - a.netAmount || a.curatorName.localeCompare(b.curatorName)
    );
}

function buildProductSummaries(rows: CuratorSalesReportRow[]) {
  const groups = new Map<string, CuratorSalesReportRow[]>();

  for (const row of rows) {
    pushToMap(groups, `${row.curatorId}:${row.serviceId}`, row);
  }

  return Array.from(groups.values())
    .map((group) => {
      const first = group[0];
      const paidRows = group.filter(
        (row) => row.orderStatus === OrderStatus.PAID
      );

      return {
        curatorId: first.curatorId,
        curatorName: first.curatorName,
        grossAmount: paidRows.reduce((sum, row) => sum + row.amountRub, 0),
        serviceId: first.serviceId,
        serviceTitle: first.serviceTitle,
        salesCount: paidRows.length
      } satisfies ProductSalesSummary;
    })
    .sort(
      (a, b) =>
        b.grossAmount - a.grossAmount ||
        a.serviceTitle.localeCompare(b.serviceTitle)
    );
}

function buildMonthlySummaries(rows: CuratorSalesReportRow[]) {
  const groups = new Map<string, CuratorSalesReportRow[]>();

  for (const row of rows) {
    pushToMap(groups, getMonthKey(row.saleDate), row);
  }

  return Array.from(groups.entries())
    .map(([month, group]) => {
      const paidRows = group.filter(
        (row) => row.orderStatus === OrderStatus.PAID
      );
      const refundRows = group.filter(
        (row) => row.orderStatus === OrderStatus.REFUNDED
      );
      const refundsAmount = refundRows.reduce(
        (sum, row) => sum + row.amountRub,
        0
      );
      const grossAmount = paidRows.reduce((sum, row) => sum + row.amountRub, 0);

      return {
        customers: countUniqueCustomers(group),
        grossAmount,
        month,
        monthLabel: getMonthLabel(month),
        netAmount: grossAmount - refundsAmount,
        refundsAmount,
        refundsCount: refundRows.length,
        salesCount: paidRows.length
      } satisfies MonthlySalesSummary;
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getCuratorSalesReport(
  searchParams?: SearchParamsInput
): Promise<CuratorSalesReport> {
  const filters = parseCuratorSalesFilters(searchParams);
  const where = buildCuratorSalesWhere(filters);

  const [orders, curators, services, allReferralLinks] = await Promise.all([
    prisma.order.findMany({
      orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
      select: {
        amountRub: true,
        createdAt: true,
        currency: true,
        customerEmail: true,
        customerName: true,
        customerPhone: true,
        customerTelegram: true,
        id: true,
        orderNumber: true,
        payment: {
          select: {
            paidAt: true,
            status: true
          }
        },
        referralLink: {
          select: {
            id: true,
            isPrimary: true,
            slug: true,
            title: true
          }
        },
        referralLinkId: true,
        referralLinkTitleSnapshot: true,
        referralSlug: true,
        service: {
          select: {
            id: true,
            title: true
          }
        },
        serviceOptions: {
          orderBy: { sortOrder: "asc" },
          select: {
            titleSnapshot: true
          }
        },
        sourceDomain: true,
        status: true,
        curator: {
          select: {
            id: true,
            name: true
          }
        }
      },
      where
    }),
    prisma.curator.findMany({
      orderBy: [
        { isSystem: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: {
        active: true,
        id: true,
        name: true
      }
    }),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true
      }
    }),
    prisma.referralLink.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        curator: {
          select: {
            name: true
          }
        },
        isPrimary: true,
        slug: true,
        title: true
      }
    })
  ]);

  const referralLinkBySlug = new Map(
    allReferralLinks.map((link) => [link.slug, link])
  );

  const rows = orders.map((order) => {
    const referralSlug = order.referralSlug ?? "";
    const referralLink =
      order.referralLink ??
      (referralSlug ? referralLinkBySlug.get(referralSlug) : undefined);
    const fallbackPartnerLabel = referralSlug
      ? referralLink
        ? getReferralLabel(referralLink)
        : referralSlug
      : "Без ссылки";

    return {
      amountRub: order.amountRub,
      currency: order.currency,
      curatorId: order.curator.id,
      curatorName: order.curator.name,
      customerEmail: order.customerEmail ?? "",
      customerName: order.customerName,
      customerPhone: order.customerPhone ?? "",
      customerTelegram: order.customerTelegram ?? "",
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      partnerLabel:
        order.referralLinkTitleSnapshot?.trim() || fallbackPartnerLabel,
      paymentStatus: order.payment?.status ?? "",
      referralLinkId: order.referralLinkId ?? "",
      referralLinkTitleSnapshot: order.referralLinkTitleSnapshot?.trim() ?? "",
      referralSlug,
      saleDate: order.payment?.paidAt ?? order.createdAt,
      serviceId: order.service.id,
      serviceOptionsLabel: order.serviceOptions
        .map((option) => option.titleSnapshot)
        .join(" / "),
      serviceTitle: order.service.title,
      sourceDomain: order.sourceDomain
    } satisfies CuratorSalesReportRow;
  });

  const stats = {
    curatorsCount: new Set(rows.map((row) => row.curatorId)).size,
    netAmount: rows.reduce((sum, row) => sum + getSignedAmount(row), 0),
    referralSourcesCount: new Set(rows.map(getPartnerKey)).size,
    salesCount: rows.filter((row) => row.orderStatus === OrderStatus.PAID)
      .length,
    uniqueCustomers: countUniqueCustomers(rows)
  };

  return {
    filters,
    filterOptions: {
      curators,
      referralLinks: allReferralLinks.map((link) => ({
        curatorName: link.curator.name,
        isPrimary: link.isPrimary,
        slug: link.slug,
        title: link.title
      })),
      services
    },
    monthlySummaries: buildMonthlySummaries(rows),
    productSummaries: buildProductSummaries(rows),
    referralSummaries: buildReferralSummaries(rows),
    rows,
    stats,
    summaries: buildCuratorSummaries(rows)
  };
}
