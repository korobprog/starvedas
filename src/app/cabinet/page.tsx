import {
  MarkSalesSeen,
  SalesCountBadge,
  SalesNotificationsProvider
} from "@/components/sales-notifications";
import { getUnseenSalesState } from "@/server/sales-notifications";
import {
  ClientFunnelStatus,
  OrderStatus,
  ParticipantListClaimRole,
  ParticipantListStatus,
  PaymentStatus,
  Prisma,
  UserRole
} from "@prisma/client";
import { cookies } from "next/headers";
import Link from "next/link";
import { CabinetBurgerNav } from "@/components/cabinet-burger-nav";
import { CuratorServiceCopyBuffer } from "@/components/curator-service-copy-buffer";
import { ClientsTable } from "@/components/clients-table";
import { ParticipantsTable } from "@/components/participants-table";
import { PartnerApplicationGate } from "@/components/partner-application-gate";
import { ParticipantListsPanel } from "@/components/participant-lists-panel";
import { ReferralLinkTools } from "@/components/referral-link-tools";
import { ServiceEditorList } from "@/components/service-form";
import { formatMoney } from "@/i18n/pricing";
import { formatStatus } from "@/lib/status-labels";
import { prisma } from "@/lib/prisma";
import {
  canManageServices as getServiceManagementAccess,
  requireUser
} from "@/server/auth";
import { getCabinetCuratorIdForSessionUser } from "@/server/cabinet-curator";
import { logoutAction } from "@/server/auth-actions";
import {
  createCabinetReferralLinkAction,
  saveCabinetCuratorSettings,
  toggleCabinetReferralLinkAction,
  updateCabinetReferralLinkAction
} from "@/server/curator-actions";
import { saveCabinetPaymentSettings } from "@/server/curator-payment-actions";
import {
  confirmCustomPaymentAction,
  savePaymentReceiptAction
} from "@/server/order-actions";
import {
  buildCuratorServiceParticipantListBuffers,
  getCuratorParticipantLists
} from "@/server/participant-lists";
import {
  customPaymentProviderCodes,
  getCuratorPaymentProviderSettings
} from "@/server/payment-providers";
import {
  buildReferralPath,
  buildReferralUrl,
  getReferralPublicOrigin
} from "@/server/referrals";
import {
  decodeTelegramProfileCookieValue,
  getCuratorTelegramBotUsername
} from "@/server/telegram-mini-app";
import { getManagedServices } from "@/server/services";
import { getPartnerProgramAgreementText } from "@/server/partner-applications";

export const dynamic = "force-dynamic";

async function getOrigin() {
  return getReferralPublicOrigin();
}

async function getCuratorTelegramProfile() {
  const cookieStore = await cookies();

  return {
    name: decodeTelegramProfileCookieValue(
      cookieStore.get("curator_telegram_name")?.value
    ),
    photoUrl: decodeTelegramProfileCookieValue(
      cookieStore.get("curator_telegram_photo_url")?.value
    )
  };
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "К";
}

function getTelegramBotUsername() {
  return getCuratorTelegramBotUsername();
}

function buildTelegramMiniAppReferralUrl(slug: string) {
  const botUsername = getTelegramBotUsername();

  return botUsername
    ? `https://t.me/${botUsername}?startapp=${encodeURIComponent(slug)}`
    : "";
}

const cabinetOrderSelect = Prisma.validator<Prisma.OrderSelect>()({
  amountRub: true,
  createdAt: true,
  currency: true,
  customerEmail: true,
  customerName: true,
  customerPhone: true,
  customerTelegram: true,
  id: true,
  leadStatus: true,
  orderNumber: true,
  payment: {
    select: {
      provider: true,
      receiptLabel: true,
      receiptUrl: true,
      status: true
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
      priceRubSnapshot: true,
      titleSnapshot: true
    }
  },
  referralSlug: true,
  sourceDomain: true,
  status: true
});

const cabinetCuratorSelect = Prisma.validator<Prisma.CuratorSelect>()({
  canEditPostPurchase: true,
  canEditSupport: true,
  canViewClients: true,
  id: true,
  name: true,
  postPurchaseText: true,
  postPurchaseTitle: true,
  postPurchaseUrl: true,
  partnerApplication: {
    select: {
      adminComment: true,
      bankDetails: true,
      comment: true,
      createdAt: true,
      email: true,
      fullName: true,
      inn: true,
      ogrnip: true,
      phone: true,
      registrationAddress: true,
      status: true,
      type: true
    }
  },
  showMailingConsentCheckbox: true,
  referralLinks: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      active: true,
      createdAt: true,
      createdByCurator: true,
      id: true,
      isPrimary: true,
      slug: true,
      title: true
    }
  },
  slug: true,
  supportButtonLabel: true,
  supportEnabled: true,
  supportUrl: true
});

async function getCabinetCurator(
  user: Awaited<ReturnType<typeof requireUser>>
) {
  if (user.role === UserRole.CURATOR) {
    const curator = await prisma.curator.findFirst({
      where: {
        active: true,
        userId: user.id
      },
      select: cabinetCuratorSelect
    });

    if (!curator) {
      return null;
    }

    const orders = curator.canViewClients
      ? await prisma.order.findMany({
          orderBy: { createdAt: "desc" },
          select: cabinetOrderSelect,
          where: { curatorId: curator.id, deletedAt: null }
        })
      : [];

    return { ...curator, orders };
  }

  const curatorId = await getCabinetCuratorIdForSessionUser(user);
  const curator = await prisma.curator.findUnique({
    where: { id: curatorId ?? "" },
    select: cabinetCuratorSelect
  });

  if (!curator) {
    return null;
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: cabinetOrderSelect,
    where: { curatorId: curator.id, deletedAt: null }
  });

  return { ...curator, orders };
}

function formatContacts(order: {
  customerEmail: string | null;
  customerPhone: string | null;
  customerTelegram: string | null;
}) {
  return [order.customerTelegram, order.customerPhone, order.customerEmail]
    .filter(Boolean)
    .join(", ");
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

function parseParticipantFilters(searchParams: SearchParams | undefined) {
  const dateFrom = firstParam(searchParams?.dateFrom);
  const dateTo = firstParam(searchParams?.dateTo);

  return {
    dateFrom: dateFrom || "",
    dateTo: dateTo || "",
    referralSlug: firstParam(searchParams?.referralSlug) || "",
    serviceId: firstParam(searchParams?.serviceId) || "",
    sourceDomain: firstParam(searchParams?.sourceDomain) || ""
  };
}

const participantListViews = ["new", "in_work", "archive", "all"] as const;

function parseParticipantListView(value: string | undefined) {
  return participantListViews.find((view) => view === value) ?? "new";
}

function parseParticipantListFilters(searchParams: SearchParams | undefined) {
  return {
    serviceId: firstParam(searchParams?.listServiceId) || "",
    view: parseParticipantListView(firstParam(searchParams?.listView))
  };
}

const clientStatuses = [
  ClientFunnelStatus.VISITED,
  ClientFunnelStatus.STARTED_CHECKOUT,
  ClientFunnelStatus.DID_NOT_BUY,
  ClientFunnelStatus.BOUGHT
] as const;

function parseClientStatus(value: string | undefined) {
  return clientStatuses.find((status) => status === value);
}

function parseClientConsent(value: string | undefined) {
  return value === "yes" || value === "no" ? value : "";
}

function parseClientFilters(searchParams: SearchParams | undefined) {
  const dateFrom = firstParam(searchParams?.clientDateFrom);
  const dateTo = firstParam(searchParams?.clientDateTo);

  return {
    consent: parseClientConsent(firstParam(searchParams?.clientConsent)),
    dateFrom: dateFrom || "",
    dateTo: dateTo || "",
    referralSlug: firstParam(searchParams?.clientReferralSlug) || "",
    serviceId: firstParam(searchParams?.clientServiceId) || "",
    sourceDomain: firstParam(searchParams?.clientSourceDomain) || "",
    status: parseClientStatus(firstParam(searchParams?.clientStatus))
  };
}

type CabinetSection =
  | "overview"
  | "content"
  | "products"
  | "payments"
  | "lists"
  | "clients";

const cabinetSectionMeta: Record<
  CabinetSection,
  { description: string; label: string }
> = {
  overview: {
    description: "Ссылка и статистика",
    label: "Обзор"
  },
  content: {
    description: "Текст после покупки",
    label: "Сообщение"
  },
  products: {
    description: "Товары и абонементы",
    label: "Продукты"
  },
  payments: {
    description: "Способы и проверки",
    label: "Оплата"
  },
  lists: {
    description: "Списки и уточнения",
    label: "Списки"
  },
  clients: {
    description: "Заявки и рассылки",
    label: "Клиенты"
  }
};

function buildParticipantOrderWhere(
  curatorId: string,
  filters: ReturnType<typeof parseParticipantFilters>
) {
  const createdAt: Prisma.DateTimeFilter = {};
  const from = parseDate(filters.dateFrom);
  const to = parseDate(filters.dateTo, true);

  if (from) {
    createdAt.gte = from;
  }

  if (to) {
    createdAt.lt = to;
  }

  return {
    createdAt: Object.keys(createdAt).length ? createdAt : undefined,
    curatorId,
    deletedAt: null,
    referralSlug: filters.referralSlug || undefined,
    serviceId: filters.serviceId || undefined,
    sourceDomain: filters.sourceDomain || undefined,
    status: OrderStatus.PAID
  } satisfies Prisma.OrderWhereInput;
}

async function getCabinetParticipantData(
  curatorId: string,
  filters: ReturnType<typeof parseParticipantFilters>
) {
  const orderWhere = buildParticipantOrderWhere(curatorId, filters);

  return Promise.all([
    prisma.orderParticipant.findMany({
      orderBy: [
        { order: { createdAt: "desc" } },
        { order: { orderNumber: "desc" } },
        { sortOrder: "asc" }
      ],
      select: {
        fullName: true,
        history: {
          orderBy: {
            createdAt: "desc"
          },
          select: {
            changedBy: {
              select: {
                name: true
              }
            },
            createdAt: true,
            fromFullName: true,
            id: true,
            note: true,
            toFullName: true
          },
          take: 5
        },
        id: true,
        order: {
          select: {
            createdAt: true,
            curator: {
              select: {
                name: true
              }
            },
            customerEmail: true,
            customerName: true,
            customerPhone: true,
            customerTelegram: true,
            id: true,
            orderNumber: true,
            payment: {
              select: {
                status: true
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
                priceRubSnapshot: true,
                titleSnapshot: true
              }
            },
            sourceDomain: true,
            status: true
          }
        }
      },
      where: {
        order: orderWhere
      }
    }),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true
      },
      where: {
        orders: {
          some: {
            curatorId,
            deletedAt: null,
            status: OrderStatus.PAID
          }
        }
      }
    })
  ]);
}

function buildClientWhere(
  curatorId: string,
  filters: ReturnType<typeof parseClientFilters>
) {
  const updatedAt: Prisma.DateTimeFilter = {};
  const from = parseDate(filters.dateFrom);
  const to = parseDate(filters.dateTo, true);

  if (from) {
    updatedAt.gte = from;
  }

  if (to) {
    updatedAt.lt = to;
  }

  return {
    consentMailings:
      filters.consent === "yes"
        ? true
        : filters.consent === "no"
          ? false
          : undefined,
    curatorId,
    orders: filters.serviceId
      ? {
          some: {
            deletedAt: null,
            serviceId: filters.serviceId
          }
        }
      : undefined,
    referralSlug: filters.referralSlug || undefined,
    sourceDomain: filters.sourceDomain || undefined,
    status: filters.status,
    updatedAt: Object.keys(updatedAt).length ? updatedAt : undefined
  } satisfies Prisma.ClientProfileWhereInput;
}

async function getCabinetClientData(
  curatorId: string,
  filters: ReturnType<typeof parseClientFilters>
) {
  const where = buildClientWhere(curatorId, filters);

  return Promise.all([
    prisma.clientProfile.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        _count: {
          select: {
            orders: {
              where: {
                deletedAt: null
              }
            }
          }
        },
        boughtAt: true,
        checkoutStartedAt: true,
        consentMailings: true,
        createdAt: true,
        curator: {
          select: {
            name: true
          }
        },
        didNotBuyAt: true,
        email: true,
        id: true,
        lastVisitedAt: true,
        name: true,
        orders: {
          orderBy: {
            createdAt: "desc"
          },
          select: {
            amountRub: true,
            currency: true,
            createdAt: true,
            id: true,
            orderNumber: true,
            payment: {
              select: {
                status: true
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
                priceRubSnapshot: true,
                titleSnapshot: true
              }
            },
            sourceDomain: true,
            status: true
          },
          where: {
            deletedAt: null
          },
          take: 1
        },
        phone: true,
        referralSlug: true,
        source: true,
        sourceDomain: true,
        status: true,
        telegram: true,
        updatedAt: true
      },
      where
    }),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true
      },
      where: {
        orders: {
          some: {
            curatorId,
            deletedAt: null
          }
        }
      }
    })
  ]);
}

async function getAwaitingCustomOrders(
  curatorId: string,
  filters: ReturnType<typeof parseParticipantFilters>
) {
  return prisma.order.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      amountRub: true,
      currency: true,
      createdAt: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      id: true,
      orderNumber: true,
      payment: {
        select: {
          provider: true,
          receiptLabel: true,
          receiptUrl: true,
          status: true
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
          priceRubSnapshot: true,
          titleSnapshot: true
        }
      },
      sourceDomain: true,
      status: true
    },
    where: {
      curatorId,
      deletedAt: null,
      payment: {
        provider: {
          in: [...customPaymentProviderCodes]
        },
        status: PaymentStatus.AWAITING_VERIFICATION
      },
      sourceDomain: filters.sourceDomain || undefined,
      status: OrderStatus.WAITING_PAYMENT_VERIFICATION
    }
  });
}

function getReferralSourceLabel(link: {
  createdByCurator?: boolean | null;
  isPrimary?: boolean | null;
  slug: string;
  title?: string | null;
}) {
  if (link.title?.trim()) {
    return link.title.trim();
  }

  return link.isPrimary
    ? "Основная ссылка от администратора"
    : link.createdByCurator
      ? "Партнёрская ссылка куратора"
      : link.slug;
}

async function getReferralStats(curatorId: string) {
  const [orders, clients, events] = await Promise.all([
    prisma.order.findMany({
      select: {
        amountRub: true,
        currency: true,
        referralSlug: true,
        status: true
      },
      where: {
        curatorId,
        deletedAt: null,
        referralSlug: {
          not: null
        }
      }
    }),
    prisma.clientProfile.findMany({
      select: {
        referralSlug: true,
        status: true
      },
      where: {
        curatorId,
        referralSlug: {
          not: null
        }
      }
    }),
    prisma.clientEvent.findMany({
      select: {
        referralSlug: true,
        status: true
      },
      where: {
        curatorId,
        referralSlug: {
          not: null
        }
      }
    })
  ]);
  const stats = new Map<
    string,
    {
      boughtClients: number;
      clients: number;
      paidAmountRub: number;
      paidOrders: number;
      refundedAmountRub: number;
      refunds: number;
      visits: number;
    }
  >();

  function ensure(slug: string | null) {
    const key = slug || "";
    const current = stats.get(key);

    if (current) {
      return current;
    }

    const next = {
      boughtClients: 0,
      clients: 0,
      paidAmountRub: 0,
      paidOrders: 0,
      refundedAmountRub: 0,
      refunds: 0,
      visits: 0
    };

    stats.set(key, next);

    return next;
  }

  for (const event of events) {
    if (event.status === ClientFunnelStatus.VISITED) {
      ensure(event.referralSlug).visits += 1;
    }
  }

  for (const client of clients) {
    const row = ensure(client.referralSlug);

    row.clients += 1;
    if (client.status === ClientFunnelStatus.BOUGHT) {
      row.boughtClients += 1;
    }
  }

  for (const order of orders) {
    const row = ensure(order.referralSlug);

    if (order.status === OrderStatus.PAID) {
      row.paidOrders += 1;
      if (order.currency === "RUB") {
        row.paidAmountRub += order.amountRub;
      }
    }

    if (order.status === OrderStatus.REFUNDED) {
      row.refunds += 1;
      if (order.currency === "RUB") {
        row.refundedAmountRub += order.amountRub;
      }
    }
  }

  return stats;
}

export default async function CabinetPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );
  const [
    curator,
    origin,
    rawSearchParams,
    serviceManagementAccess,
    telegramProfile
  ] = await Promise.all([
    getCabinetCurator(user),
    getOrigin(),
    searchParams,
    getServiceManagementAccess(),
    getCuratorTelegramProfile()
  ]);

  if (!curator) {
    return (
      <main className="admin-page">
        <div className="container admin-shell">
          <section className="admin-card">
            <h1>Кабинет не найден</h1>
            <p className="admin-muted">
              Попросите администратора привязать ваш логин к куратору.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const primaryReferralSlug =
    curator.referralLinks.find((link) => link.isPrimary)?.slug ?? curator.slug;
  const referral = origin
    ? buildReferralUrl(origin, primaryReferralSlug)
    : buildReferralPath(primaryReferralSlug);
  const telegramMiniAppReferral =
    buildTelegramMiniAppReferralUrl(primaryReferralSlug);
  const canViewClients =
    user.role !== UserRole.CURATOR || curator.canViewClients;
  const canViewParticipantLists =
    user.role === UserRole.CURATOR || canViewClients;
  const canOpenProductsSection =
    serviceManagementAccess || user.role === UserRole.CURATOR;
  const canManageCabinetPayments =
    user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const availableCabinetSections: CabinetSection[] = [
    "overview",
    "content",
    ...(canOpenProductsSection ? (["products"] as const) : []),
    ...(canManageCabinetPayments ? (["payments"] as const) : []),
    ...(canViewParticipantLists ? (["lists"] as const) : []),
    ...(canViewClients ? (["clients"] as const) : [])
  ];
  const defaultCabinetSection: CabinetSection =
    user.role === UserRole.CURATOR && availableCabinetSections.includes("lists")
      ? "lists"
      : "overview";
  const requestedSection = firstParam(rawSearchParams?.section) as
    | CabinetSection
    | undefined;
  const activeSection = availableCabinetSections.includes(
    requestedSection ?? defaultCabinetSection
  )
    ? (requestedSection ?? defaultCabinetSection)
    : defaultCabinetSection;
  const unseenSales = await getUnseenSalesState();
  const participantFilters = parseParticipantFilters(rawSearchParams);
  const participantListFilters = parseParticipantListFilters(rawSearchParams);
  const clientFilters = parseClientFilters(rawSearchParams);
  const paidOrders = curator.orders.filter((order) => order.status === "PAID");
  const paidAmount = paidOrders.reduce(
    (total, order) => total + (order.currency === "RUB" ? order.amountRub : 0),
    0
  );
  const [
    paymentSettings,
    participantData,
    clientData,
    awaitingCustomOrders,
    participantLists,
    managedServices,
    referralStats,
    partnerProgramAgreementText
  ] = await Promise.all([
    getCuratorPaymentProviderSettings(curator.id),
    canViewClients
      ? getCabinetParticipantData(curator.id, participantFilters)
      : Promise.resolve([[], []] as Awaited<
          ReturnType<typeof getCabinetParticipantData>
        >),
    canViewClients
      ? getCabinetClientData(curator.id, clientFilters)
      : Promise.resolve([[], []] as Awaited<
          ReturnType<typeof getCabinetClientData>
        >),
    canViewClients
      ? getAwaitingCustomOrders(curator.id, participantFilters)
      : Promise.resolve([]),
    canViewParticipantLists
      ? getCuratorParticipantLists(curator.id)
      : Promise.resolve([]),
    serviceManagementAccess ? getManagedServices() : Promise.resolve([]),
    canViewClients ? getReferralStats(curator.id) : Promise.resolve(new Map()),
    getPartnerProgramAgreementText()
  ]);
  const enabledPaymentSettings = paymentSettings.filter(
    (provider) => provider.active && provider.allowed
  );
  const [participants, participantServices] = participantData;
  const [clients, clientServices] = clientData;
  const curatorListBuffers =
    user.role === UserRole.CURATOR
      ? buildCuratorServiceParticipantListBuffers(participantLists)
      : [];
  const selectedCuratorListServiceId =
    firstParam(rawSearchParams?.listServiceId) || "";
  const selectedCuratorListBuffer = selectedCuratorListServiceId
    ? curatorListBuffers.find(
        (buffer) => buffer.serviceId === selectedCuratorListServiceId
      )
    : undefined;
  const filteredParticipantLists = participantLists.filter((list) => {
    if (
      participantListFilters.serviceId &&
      list.order.service.id !== participantListFilters.serviceId
    ) {
      return false;
    }

    if (participantListFilters.view === "all") {
      return true;
    }

    if (participantListFilters.view === "new") {
      return list.status === ParticipantListStatus.NEW && !list.claimedByRole;
    }

    if (participantListFilters.view === "in_work") {
      return (
        list.claimedByRole === ParticipantListClaimRole.CURATOR &&
        list.claimedByCuratorId === curator.id
      );
    }

    return (
      [
        ParticipantListStatus.CHECKED,
        ParticipantListStatus.READY_TO_SEND,
        ParticipantListStatus.SENT,
        ParticipantListStatus.ARCHIVED
      ] as ParticipantListStatus[]
    ).includes(list.status);
  });
  const referralLinkRows = curator.referralLinks.map((link) => {
    const webUrl = origin
      ? buildReferralUrl(origin, link.slug)
      : buildReferralPath(link.slug);
    const telegramUrl = buildTelegramMiniAppReferralUrl(link.slug);
    const stats = referralStats.get(link.slug) ?? {
      boughtClients: 0,
      clients: 0,
      paidAmountRub: 0,
      paidOrders: 0,
      refundedAmountRub: 0,
      refunds: 0,
      visits: 0
    };
    const netAmountRub = stats.paidAmountRub - stats.refundedAmountRub;
    const conversion =
      stats.clients > 0
        ? Math.round((stats.paidOrders / stats.clients) * 100)
        : 0;

    return {
      ...link,
      conversion,
      label: getReferralSourceLabel(link),
      netAmountRub,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(webUrl)}`,
      stats,
      telegramUrl,
      webUrl
    };
  });
  const telegramDisplayName = telegramProfile.name || curator.name;
  const telegramInitials = getInitials(telegramDisplayName);
  const canCreatePartnerReferralLinks =
    curator.partnerApplication?.status === "APPROVED";

  return (
    <SalesNotificationsProvider initialCount={unseenSales.count}>
    <main
      className={
        user.role === UserRole.CURATOR
          ? "admin-page admin-page--telegram-mini-app"
          : "admin-page"
      }
    >
      <div className="container admin-shell">
        <header className="admin-header">
          <div className="cabinet-curator-profile">
            <span
              aria-hidden="true"
              className={
                telegramProfile.photoUrl
                  ? "cabinet-curator-avatar cabinet-curator-avatar--photo"
                  : "cabinet-curator-avatar"
              }
              style={
                telegramProfile.photoUrl
                  ? { backgroundImage: `url(${telegramProfile.photoUrl})` }
                  : undefined
              }
            >
              {telegramProfile.photoUrl ? null : telegramInitials}
            </span>
            <div>
              <p className="eyebrow">Кабинет куратора</p>
              <h1>{curator.name}</h1>
              {telegramProfile.name &&
                telegramProfile.name !== curator.name && (
                  <p className="admin-muted">
                    Telegram: {telegramProfile.name}
                  </p>
                )}
            </div>
          </div>
          {user.role === UserRole.CURATOR ? (
            <CabinetBurgerNav>
              <Link className="button" href="/">
                На сайт
              </Link>
              <form action={logoutAction}>
                <button className="button" type="submit">
                  Выйти
                </button>
              </form>
            </CabinetBurgerNav>
          ) : (
            <nav className="admin-nav" aria-label="Кабинет">
              <Link className="button" href="/admin/curators">
                Админка
              </Link>
              <Link className="button" href="/admin/recovery">
                Восстановление
              </Link>
              <Link className="button" href="/">
                На сайт
              </Link>
              <form action={logoutAction}>
                <button className="button" type="submit">
                  Выйти
                </button>
              </form>
            </nav>
          )}
        </header>

        {activeSection === "overview" && <MarkSalesSeen />}
        <nav className="cabinet-section-menu" aria-label="Разделы кабинета">
          {availableCabinetSections.map((section) => {
            const meta = cabinetSectionMeta[section];

            return (
              <Link
                aria-current={activeSection === section ? "page" : undefined}
                className={
                  activeSection === section
                    ? "cabinet-section-menu__item cabinet-section-menu__item--active"
                    : "cabinet-section-menu__item"
                }
                href={`/cabinet?section=${section}`}
                key={section}
              >
                <span>
                  {meta.label}
                  {section === "overview" && <SalesCountBadge />}
                </span>
                <small>{meta.description}</small>
              </Link>
            );
          })}
        </nav>

        <div className="admin-grid">
          {activeSection === "overview" && (
            <section className="admin-card admin-card--wide">
              <h2>Реферальная ссылка</h2>
              <p className="admin-muted">
                Клиенты, которые перейдут по этой ссылке, попадут к вам.
              </p>
              <ReferralLinkTools displayValue={referral} href={referral} />
              {telegramMiniAppReferral && (
                <>
                  <p className="admin-muted">
                    Ссылка для Telegram Mini App: клиент сразу войдёт в кабинет,
                    а реферальный код сохранится из параметра startapp.
                  </p>
                  <ReferralLinkTools
                    displayValue={telegramMiniAppReferral}
                    href={telegramMiniAppReferral}
                  />
                </>
              )}
              {canViewClients ? (
                <div className="stats-grid">
                  <div>
                    <strong>{curator.orders.length}</strong>
                    <span>заказов</span>
                  </div>
                  <div>
                    <strong>{paidOrders.length}</strong>
                    <span>оплачено</span>
                  </div>
                  <div>
                    <strong>{paidAmount.toLocaleString("ru-RU")}</strong>
                    <span>руб.</span>
                  </div>
                </div>
              ) : (
                <p className="admin-muted">
                  Просмотр клиентов отключен администратором.
                </p>
              )}
            </section>
          )}

          {activeSection === "overview" && !canCreatePartnerReferralLinks && (
            <PartnerApplicationGate
              agreementText={partnerProgramAgreementText}
              application={curator.partnerApplication}
            />
          )}

          {activeSection === "overview" && canCreatePartnerReferralLinks && (
            <section className="admin-card admin-card--wide">
              <div className="admin-card__header">
                <div>
                  <h2>Личные ссылки для партнёров</h2>
                  <p className="admin-muted">
                    Создавайте отдельную ссылку для клуба, партнёра или канала.
                    Первый переход закрепляется за клиентом до регистрации, а
                    после регистрации атрибуция сохраняется навсегда.
                  </p>
                </div>
              </div>

              <form
                action={createCabinetReferralLinkAction}
                className="admin-form filter-form"
              >
                <label className="field">
                  <span>Название источника</span>
                  <input
                    maxLength={120}
                    name="title"
                    placeholder="Например: Клуб Ромашка"
                    required
                    type="text"
                  />
                </label>
                <div className="filter-form__actions">
                  <button className="button button--primary" type="submit">
                    Сгенерировать ссылку
                  </button>
                </div>
              </form>

              <div className="participant-tools">
                <a className="button" href="/cabinet/referrals/export">
                  Скачать всю бухгалтерию CSV
                </a>
              </div>

              <div className="table-wrap">
                <table className="admin-table referral-stats-table">
                  <thead>
                    <tr>
                      <th>Источник</th>
                      <th>Ссылки</th>
                      <th>Статистика</th>
                      <th>Бухгалтерия</th>
                      <th>QR</th>
                      <th>Управление</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralLinkRows.map((link) => (
                      <tr key={link.id}>
                        <td>
                          <strong>{link.label}</strong>
                          <br />
                          <span
                            className={
                              link.active
                                ? "badge badge--success"
                                : "badge badge--muted"
                            }
                          >
                            {link.active ? "Активна" : "Отключена"}
                          </span>{" "}
                          <span className="badge badge--muted">
                            {link.isPrimary
                              ? "ссылка от админа"
                              : link.createdByCurator
                                ? "ссылка куратора"
                                : "старая ссылка"}
                          </span>
                        </td>
                        <td>
                          <ReferralLinkTools
                            displayValue={link.webUrl}
                            href={link.webUrl}
                          />
                          {link.telegramUrl && (
                            <>
                              <br />
                              <ReferralLinkTools
                                displayValue={`Telegram: ${link.telegramUrl}`}
                                href={link.telegramUrl}
                              />
                            </>
                          )}
                        </td>
                        <td>
                          Визитов: {link.stats.visits}
                          <br />
                          Регистраций: {link.stats.clients}
                          <br />
                          Покупателей: {link.stats.boughtClients}
                          <br />
                          Оплат: {link.stats.paidOrders}
                          <br />
                          Конверсия: {link.conversion}%
                        </td>
                        <td>
                          Оплачено:{" "}
                          {formatMoney(link.stats.paidAmountRub, "RUB")}
                          <br />
                          Возвраты:{" "}
                          {formatMoney(link.stats.refundedAmountRub, "RUB")}
                          <br />
                          Итого: {formatMoney(link.netAmountRub, "RUB")}
                          <br />
                          <a
                            href={`/cabinet/referrals/export?slug=${encodeURIComponent(link.slug)}`}
                          >
                            Скачать CSV
                          </a>
                        </td>
                        <td>
                          <a href={link.qrUrl} rel="noreferrer" target="_blank">
                            Открыть QR
                          </a>
                        </td>
                        <td>
                          {link.isPrimary ? (
                            <span className="admin-muted">
                              Основная ссылка редактируется админом
                            </span>
                          ) : (
                            <div className="referral-actions">
                              <form action={updateCabinetReferralLinkAction}>
                                <input
                                  name="id"
                                  type="hidden"
                                  value={link.id}
                                />
                                <input
                                  aria-label="Название ссылки"
                                  className="table-input"
                                  defaultValue={link.label}
                                  maxLength={120}
                                  name="title"
                                  required
                                  type="text"
                                />
                                <button
                                  className="button button--small"
                                  type="submit"
                                >
                                  Переименовать
                                </button>
                              </form>
                              <form action={toggleCabinetReferralLinkAction}>
                                <input
                                  name="id"
                                  type="hidden"
                                  value={link.id}
                                />
                                <input
                                  name="active"
                                  type="hidden"
                                  value={link.active ? "off" : "on"}
                                />
                                <button
                                  className="button button--small"
                                  type="submit"
                                >
                                  {link.active ? "Отключить" : "Включить"}
                                </button>
                              </form>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === "content" && (
            <section className="admin-card admin-card--wide">
              <h2>Информация после покупки</h2>
              {!curator.canEditPostPurchase && (
                <p className="admin-muted">
                  Редактирование информации после покупки отключено
                  администратором.
                </p>
              )}
              {!curator.canEditSupport && (
                <p className="admin-muted">
                  Редактирование кнопки поддержки отключено администратором.
                </p>
              )}
              <form action={saveCabinetCuratorSettings} className="admin-form">
                <label className="field">
                  <span>Заголовок</span>
                  <input
                    defaultValue={curator.postPurchaseTitle ?? ""}
                    disabled={!curator.canEditPostPurchase}
                    name="postPurchaseTitle"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>Текст для клиента</span>
                  <textarea
                    defaultValue={curator.postPurchaseText ?? ""}
                    disabled={!curator.canEditPostPurchase}
                    name="postPurchaseText"
                    rows={5}
                  />
                </label>
                <label className="field">
                  <span>Ссылка для клиента</span>
                  <input
                    defaultValue={curator.postPurchaseUrl ?? ""}
                    disabled={!curator.canEditPostPurchase}
                    name="postPurchaseUrl"
                    placeholder="https://t.me/..."
                    type="url"
                  />
                </label>
                <label className="field">
                  <span>Текст кнопки вопроса</span>
                  <input
                    defaultValue={curator.supportButtonLabel ?? ""}
                    disabled={!curator.canEditSupport}
                    name="supportButtonLabel"
                    placeholder="Написать вопрос куратору"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>Адрес для вопросов</span>
                  <input
                    defaultValue={curator.supportUrl ?? ""}
                    disabled={!curator.canEditSupport}
                    name="supportUrl"
                    placeholder="https://t.me/..., @username, email или телефон"
                    type="text"
                  />
                </label>
                <p className="admin-muted">
                  Сейчас кнопка{" "}
                  {curator.supportEnabled ? "показывается" : "скрыта админом"}.
                </p>
                <label className="checkbox-field">
                  <input
                    defaultChecked={curator.showMailingConsentCheckbox}
                    name="showMailingConsentCheckbox"
                    type="checkbox"
                  />
                  <span>
                    Показывать чекбокс согласия на рассылку в форме заявки
                  </span>
                </label>
                <button className="button button--primary" type="submit">
                  Сохранить
                </button>
              </form>
            </section>
          )}

          {activeSection === "products" &&
            (serviceManagementAccess ? (
              <section className="admin-card admin-card--wide">
                <div className="admin-card__header">
                  <div>
                    <h2>Продукты и абонементы</h2>
                    <p className="admin-muted">
                      Компактный список без больших форм. Откройте карточку,
                      чтобы изменить цены, переводы и обряды внутри раздела.
                    </p>
                  </div>
                  <div className="admin-card__actions">
                    <Link
                      className="button button--primary"
                      href="/admin/products/new"
                    >
                      Создать продукт
                    </Link>
                  </div>
                </div>
                <ServiceEditorList services={managedServices} />
              </section>
            ) : (
              user.role === UserRole.CURATOR && (
                <section className="admin-card admin-card--wide">
                  <h2>Продукты и абонементы</h2>
                  <p className="admin-muted">
                    Управление продуктами отключено администратором.
                  </p>
                </section>
              )
            ))}

          {activeSection === "payments" && canManageCabinetPayments && (
            <section className="admin-card admin-card--wide">
              <h2>Способы оплаты и реквизиты</h2>
              <p className="admin-muted">
                Выберите только из способов, разрешенных администратором, и
                заполните инструкции для клиентов вашей ссылки.
              </p>
              {enabledPaymentSettings.length > 0 ? (
                <form
                  action={saveCabinetPaymentSettings}
                  className="admin-form"
                >
                  <div className="payment-settings-list">
                    {enabledPaymentSettings.map((provider) => (
                      <fieldset
                        className="payment-settings-card"
                        key={provider.code}
                      >
                        <legend>{provider.name}</legend>
                        <p className="admin-muted">{provider.description}</p>
                        <label className="checkbox-field">
                          <input
                            defaultChecked={provider.enabled}
                            name={`enabled:${provider.code}`}
                            type="checkbox"
                          />
                          <span>Показывать этот способ клиентам</span>
                        </label>
                        <label className="field">
                          <span>Инструкция клиенту</span>
                          <textarea
                            defaultValue={
                              provider.instructions?.instructions ?? ""
                            }
                            name={`instructions:${provider.code}`}
                            placeholder="Например: используйте этот способ, если не получается оплатить через платежную форму."
                            rows={3}
                          />
                        </label>
                        {provider.isCustom && (
                          <>
                            <div className="field-grid">
                              <label className="field">
                                <span>Банк</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.bankName ?? ""
                                  }
                                  name={`bankName:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>Получатель</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.recipientName ?? ""
                                  }
                                  name={`recipientName:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>Карта или счет</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.accountNumber ?? ""
                                  }
                                  name={`accountNumber:${provider.code}`}
                                  type="text"
                                />
                              </label>
                            </div>
                            <div className="field-grid">
                              <label className="field">
                                <span>Телефон</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.phone ?? ""
                                  }
                                  name={`phone:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>Комментарий к платежу</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.paymentComment ?? ""
                                  }
                                  name={`paymentComment:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>Срок проверки</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.verificationPeriod ??
                                    ""
                                  }
                                  name={`verificationPeriod:${provider.code}`}
                                  placeholder="Например: до 1 рабочего дня"
                                  type="text"
                                />
                              </label>
                            </div>
                          </>
                        )}
                      </fieldset>
                    ))}
                  </div>
                  <button className="button button--primary" type="submit">
                    Сохранить способы оплаты
                  </button>
                </form>
              ) : (
                <p className="admin-muted">
                  Администратор пока не разрешил способы оплаты для этого
                  кабинета.
                </p>
              )}
            </section>
          )}

          {activeSection === "payments" &&
            canManageCabinetPayments &&
            canViewClients && (
              <section className="admin-card admin-card--wide">
                <h2>Оплаты на проверке</h2>
                <p className="admin-muted">
                  Ручное подтверждение переводит кастомную оплату в статус
                  «оплачен».
                </p>
                {awaitingCustomOrders.length > 0 ? (
                  <div className="table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Заказ</th>
                          <th>Клиент</th>
                          <th>Покупка</th>
                          <th>Сумма</th>
                          <th>Оплата</th>
                          <th>Дата</th>
                          <th>Чек</th>
                          <th>Действие</th>
                        </tr>
                      </thead>
                      <tbody>
                        {awaitingCustomOrders.map((order) => (
                          <tr key={order.id}>
                            <td>#{order.orderNumber}</td>
                            <td>
                              <strong>{order.customerName}</strong>
                              <br />
                              {formatContacts(order) || "Контакты не указаны"}
                            </td>
                            <td>
                              {order.service.title}
                              {order.serviceOptions.length ? (
                                <ul className="rite-summary-list">
                                  {order.serviceOptions.map((option) => (
                                    <li key={option.titleSnapshot}>
                                      {option.titleSnapshot}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </td>
                            <td>
                              {formatMoney(order.amountRub, order.currency)}
                            </td>
                            <td>
                              {order.payment?.provider} /{" "}
                              {order.payment?.status
                                ? formatStatus(order.payment.status)
                                : formatStatus(order.status)}
                            </td>
                            <td>
                              {order.createdAt.toLocaleDateString("ru-RU")}
                            </td>
                            <td>
                              <form
                                action={savePaymentReceiptAction}
                                className="receipt-form"
                              >
                                <input
                                  name="orderId"
                                  type="hidden"
                                  value={order.id}
                                />
                                <input
                                  className="table-input"
                                  defaultValue={order.payment?.receiptUrl ?? ""}
                                  name="receiptUrl"
                                  placeholder="https://... или /uploads/..."
                                  type="text"
                                />
                                <input
                                  className="table-input"
                                  defaultValue={
                                    order.payment?.receiptLabel ?? ""
                                  }
                                  name="receiptLabel"
                                  placeholder="Название"
                                  type="text"
                                />
                                <button
                                  className="button button--small"
                                  type="submit"
                                >
                                  Сохранить чек
                                </button>
                                {order.payment?.receiptUrl && (
                                  <a
                                    href={order.payment.receiptUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    Открыть чек
                                  </a>
                                )}
                              </form>
                            </td>
                            <td>
                              <form action={confirmCustomPaymentAction}>
                                <input
                                  name="orderId"
                                  type="hidden"
                                  value={order.id}
                                />
                                <button
                                  className="button button--small"
                                  type="submit"
                                >
                                  Подтвердить оплату
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="admin-muted">
                    Нет кастомных оплат, ожидающих проверки.
                  </p>
                )}
              </section>
            )}

          {activeSection === "lists" && canViewParticipantLists && (
            <section className="admin-card admin-card--wide">
              {user.role === UserRole.CURATOR ? (
                <>
                  <h2>Списки</h2>
                  {selectedCuratorListBuffer ? (
                    <CuratorServiceCopyBuffer
                      buffer={selectedCuratorListBuffer}
                    />
                  ) : selectedCuratorListServiceId ? (
                    <>
                      <p className="admin-muted">
                        Новых имён по этой услуге уже нет.
                      </p>
                      <Link className="button" href="/cabinet?section=lists">
                        К спискам
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3>Выберите список</h3>
                      {curatorListBuffers.length > 0 ? (
                        <div className="curator-service-list-buttons">
                          {curatorListBuffers.map((buffer) => (
                            <Link
                              className="button button--primary"
                              href={`/cabinet?section=lists&listServiceId=${encodeURIComponent(
                                buffer.serviceId
                              )}`}
                              key={buffer.serviceId}
                            >
                              {buffer.serviceTitle} — {buffer.nameCount}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="admin-muted">
                          Новых имён для копирования пока нет.
                        </p>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2>Списки участников</h2>
                  <p className="admin-muted">
                    Здесь видны списки участников по вашим оплаченным заказам,
                    статусы проверки статистом и переписка для уточнений.
                  </p>
                  <form className="admin-form filter-form">
                    <input name="section" type="hidden" value="lists" />
                    <label className="field">
                      <span>Раздел буфера</span>
                      <select
                        defaultValue={participantListFilters.view}
                        name="listView"
                      >
                        <option value="new">Новые</option>
                        <option value="in_work">В работе</option>
                        <option value="archive">Обработанные / архив</option>
                        <option value="all">Все списки</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Мероприятие</span>
                      <select
                        defaultValue={participantListFilters.serviceId}
                        name="listServiceId"
                      >
                        <option value="">Все мероприятия</option>
                        {participantServices.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="filter-form__actions">
                      <button className="button button--primary" type="submit">
                        Показать
                      </button>
                      <Link className="button" href="/cabinet?section=lists">
                        Сбросить
                      </Link>
                    </div>
                  </form>
                  <ParticipantListsPanel
                    emptyText="Оплаченных списков участников пока нет."
                    lists={filteredParticipantLists}
                    mode="curator"
                  />
                </>
              )}
            </section>
          )}

          {activeSection === "clients" && canViewClients && (
            <section className="admin-card admin-card--wide">
              <h2>Участники оплаченных заказов</h2>
              <form className="admin-form filter-form">
                <input name="section" type="hidden" value="clients" />
                <label className="field">
                  <span>Дата с</span>
                  <input
                    defaultValue={participantFilters.dateFrom}
                    name="dateFrom"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Дата по</span>
                  <input
                    defaultValue={participantFilters.dateTo}
                    name="dateTo"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Церемония</span>
                  <select
                    defaultValue={participantFilters.serviceId}
                    name="serviceId"
                  >
                    <option value="">Все церемонии</option>
                    {participantServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Статус оплаты</span>
                  <select defaultValue={OrderStatus.PAID} disabled>
                    <option value={OrderStatus.PAID}>
                      {formatStatus(OrderStatus.PAID)}
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Источник</span>
                  <select
                    defaultValue={participantFilters.sourceDomain}
                    name="sourceDomain"
                  >
                    <option value="">Все источники</option>
                    <option value="starvedas.ru">starvedas.ru</option>
                    <option value="chintamanidhama.ru">
                      chintamanidhama.ru
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Реферальная ссылка</span>
                  <select
                    defaultValue={participantFilters.referralSlug}
                    name="referralSlug"
                  >
                    <option value="">Все ссылки</option>
                    {referralLinkRows.map((link) => (
                      <option key={link.slug} value={link.slug}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filter-form__actions">
                  <button className="button button--primary" type="submit">
                    Применить фильтры
                  </button>
                  <Link className="button" href="/cabinet?section=clients">
                    Сбросить
                  </Link>
                </div>
              </form>
              <ParticipantsTable
                emptyText="Участники по выбранным фильтрам не найдены."
                participants={participants}
                showRecoveryLinks={user.role !== UserRole.CURATOR}
              />
            </section>
          )}

          {activeSection === "clients" && canViewClients && (
            <section className="admin-card admin-card--wide">
              <h2>Клиентская база и рассылки</h2>
              <p className="admin-muted">
                Фильтры помогают собрать сегменты клиентов вашего кабинета.
                Выгрузка содержит только контакты с согласием на рассылки.
              </p>
              <form className="admin-form filter-form">
                <input name="section" type="hidden" value="clients" />
                <label className="field">
                  <span>Дата статуса с</span>
                  <input
                    defaultValue={clientFilters.dateFrom}
                    name="clientDateFrom"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Дата статуса по</span>
                  <input
                    defaultValue={clientFilters.dateTo}
                    name="clientDateTo"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Сегмент</span>
                  <select
                    defaultValue={clientFilters.status ?? ""}
                    name="clientStatus"
                  >
                    <option value="">Все сегменты</option>
                    {clientStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Рассылка</span>
                  <select
                    defaultValue={clientFilters.consent}
                    name="clientConsent"
                  >
                    <option value="">Все</option>
                    <option value="yes">Есть согласие</option>
                    <option value="no">Нет согласия</option>
                  </select>
                </label>
                <label className="field">
                  <span>Церемония</span>
                  <select
                    defaultValue={clientFilters.serviceId}
                    name="clientServiceId"
                  >
                    <option value="">Все церемонии</option>
                    {clientServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Источник</span>
                  <select
                    defaultValue={clientFilters.sourceDomain}
                    name="clientSourceDomain"
                  >
                    <option value="">Все источники</option>
                    <option value="starvedas.ru">starvedas.ru</option>
                    <option value="chintamanidhama.ru">
                      chintamanidhama.ru
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Реферальная ссылка</span>
                  <select
                    defaultValue={clientFilters.referralSlug}
                    name="clientReferralSlug"
                  >
                    <option value="">Все ссылки</option>
                    {referralLinkRows.map((link) => (
                      <option key={link.slug} value={link.slug}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filter-form__actions">
                  <button className="button button--primary" type="submit">
                    Применить фильтры
                  </button>
                  <Link className="button" href="/cabinet?section=clients">
                    Сбросить
                  </Link>
                </div>
              </form>
              <ClientsTable
                clients={clients}
                emptyText="Клиенты по выбранным сегментам не найдены."
                showRecoveryLinks={user.role !== UserRole.CURATOR}
              />
            </section>
          )}

          {activeSection === "clients" && (
            <section className="admin-card admin-card--wide">
              <h2>Клиенты и покупки</h2>
              {!canViewClients ? (
                <p className="admin-muted">
                  Просмотр клиентов и покупок отключен администратором.
                </p>
              ) : curator.orders.length > 0 ? (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Заказ</th>
                        <th>Клиент</th>
                        <th>Покупка</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Контакты</th>
                        <th>Чек</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {curator.orders.map((order) => (
                        <tr key={order.id}>
                          <td>#{order.orderNumber}</td>
                          <td>{order.customerName}</td>
                          <td>
                            {order.service.title}
                            {order.serviceOptions.length ? (
                              <ul className="rite-summary-list">
                                {order.serviceOptions.map((option) => (
                                  <li key={option.titleSnapshot}>
                                    {option.titleSnapshot}
                                  </li>
                                ))}
                              </ul>
                            ) : null}
                          </td>
                          <td>
                            {formatMoney(order.amountRub, order.currency)}
                          </td>
                          <td>
                            {formatStatus(order.status)} /{" "}
                            {formatStatus(order.leadStatus)}
                            {order.payment?.status
                              ? ` / ${formatStatus(order.payment.status)}`
                              : ""}
                          </td>
                          <td>{formatContacts(order) || "Не указаны"}</td>
                          <td>
                            <form
                              action={savePaymentReceiptAction}
                              className="receipt-form"
                            >
                              <input
                                name="orderId"
                                type="hidden"
                                value={order.id}
                              />
                              <input
                                className="table-input"
                                defaultValue={order.payment?.receiptUrl ?? ""}
                                name="receiptUrl"
                                placeholder="https://... или /uploads/..."
                                type="text"
                              />
                              <input
                                className="table-input"
                                defaultValue={order.payment?.receiptLabel ?? ""}
                                name="receiptLabel"
                                placeholder="Название"
                                type="text"
                              />
                              <button
                                className="button button--small"
                                type="submit"
                              >
                                Сохранить
                              </button>
                              {order.payment?.receiptUrl && (
                                <a
                                  href={order.payment.receiptUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  Открыть
                                </a>
                              )}
                            </form>
                          </td>
                          <td>{order.createdAt.toLocaleDateString("ru-RU")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-muted">Клиентов пока нет.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
    </SalesNotificationsProvider>
  );
}
