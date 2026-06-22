import {
  ClientFunnelStatus,
  OrderStatus,
  PaymentStatus,
  Prisma,
  UserRole
} from "@prisma/client";
import { cookies } from "next/headers";
import Link from "next/link";
import { ClientsTable } from "@/components/clients-table";
import { ParticipantsTable } from "@/components/participants-table";
import { ServiceEditorList } from "@/components/service-form";
import { formatMoney } from "@/i18n/pricing";
import { formatStatus } from "@/lib/status-labels";
import { prisma } from "@/lib/prisma";
import {
  canManageServices as getServiceManagementAccess,
  requireUser
} from "@/server/auth";
import { logoutAction } from "@/server/auth-actions";
import {
  createCabinetReferralLinkAction,
  saveCabinetCuratorSettings,
  toggleCabinetReferralLinkAction,
  updateCabinetReferralLinkAction
} from "@/server/curator-actions";
import { saveCabinetPaymentSettings } from "@/server/curator-payment-actions";
import { confirmCustomPaymentAction } from "@/server/order-actions";
import {
  customPaymentProviderCodes,
  getCuratorPaymentProviderSettings
} from "@/server/payment-providers";
import {
  buildReferralPath,
  buildReferralUrl,
  ensureSystemCurator,
  getReferralPublicOrigin
} from "@/server/referrals";
import { getCuratorTelegramBotUsername } from "@/server/telegram-mini-app";
import { getManagedServices } from "@/server/services";

export const dynamic = "force-dynamic";

async function getOrigin() {
  return getReferralPublicOrigin();
}

async function getCuratorTelegramProfile() {
  const cookieStore = await cookies();

  return {
    name: cookieStore.get("curator_telegram_name")?.value ?? "",
    photoUrl: cookieStore.get("curator_telegram_photo_url")?.value ?? ""
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

  return initials || "Рљ";
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
          where: { curatorId: curator.id }
        })
      : [];

    return { ...curator, orders };
  }

  await ensureSystemCurator();

  const curator = await prisma.curator.findUnique({
    where: { slug: "administrator" },
    select: cabinetCuratorSelect
  });

  if (!curator) {
    return null;
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: cabinetOrderSelect,
    where: { curatorId: curator.id }
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
  | "clients";

const cabinetSectionMeta: Record<
  CabinetSection,
  { description: string; label: string }
> = {
  overview: {
    description: "РЎСЃС‹Р»РєР° Рё СЃС‚Р°С‚РёСЃС‚РёРєР°",
    label: "РћР±Р·РѕСЂ"
  },
  content: {
    description: "РўРµРєСЃС‚ РїРѕСЃР»Рµ РїРѕРєСѓРїРєРё",
    label: "РЎРѕРѕР±С‰РµРЅРёРµ"
  },
  products: {
    description: "РўРѕРІР°СЂС‹ Рё Р°Р±РѕРЅРµРјРµРЅС‚С‹",
    label: "РџСЂРѕРґСѓРєС‚С‹"
  },
  payments: {
    description: "РЎРїРѕСЃРѕР±С‹ Рё РїСЂРѕРІРµСЂРєРё",
    label: "РћРїР»Р°С‚Р°"
  },
  clients: {
    description: "Р—Р°СЏРІРєРё Рё СЂР°СЃСЃС‹Р»РєРё",
    label: "РљР»РёРµРЅС‚С‹"
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
            orders: true
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
            curatorId
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
    ? "РћСЃРЅРѕРІРЅР°СЏ СЃСЃС‹Р»РєР° РѕС‚ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°"
    : link.createdByCurator
      ? "РџР°СЂС‚РЅС‘СЂСЃРєР°СЏ СЃСЃС‹Р»РєР° РєСѓСЂР°С‚РѕСЂР°"
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
            <h1>РљР°Р±РёРЅРµС‚ РЅРµ РЅР°Р№РґРµРЅ</h1>
            <p className="admin-muted">
              РџРѕРїСЂРѕСЃРёС‚Рµ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РїСЂРёРІСЏР·Р°С‚СЊ РІР°С€ Р»РѕРіРёРЅ Рє РєСѓСЂР°С‚РѕСЂСѓ.
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
  const canOpenProductsSection =
    serviceManagementAccess || user.role === UserRole.CURATOR;
  const canManageCabinetPayments = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  const availableCabinetSections: CabinetSection[] = [
    "overview",
    "content",
    ...(canOpenProductsSection ? (["products"] as const) : []),
    ...(canManageCabinetPayments ? (["payments"] as const) : []),
    ...(canViewClients ? (["clients"] as const) : [])
  ];
  const requestedSection = firstParam(rawSearchParams?.section) as
    | CabinetSection
    | undefined;
  const activeSection = availableCabinetSections.includes(
    requestedSection ?? "overview"
  )
    ? (requestedSection ?? "overview")
    : "overview";
  const participantFilters = parseParticipantFilters(rawSearchParams);
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
    managedServices,
    referralStats
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
    serviceManagementAccess ? getManagedServices() : Promise.resolve([]),
    canViewClients ? getReferralStats(curator.id) : Promise.resolve(new Map())
  ]);
  const enabledPaymentSettings = paymentSettings.filter(
    (provider) => provider.active && provider.allowed
  );
  const [participants, participantServices] = participantData;
  const [clients, clientServices] = clientData;
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

  return (
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
              <p className="eyebrow">РљР°Р±РёРЅРµС‚ РєСѓСЂР°С‚РѕСЂР°</p>
              <h1>{curator.name}</h1>
              {telegramProfile.name &&
                telegramProfile.name !== curator.name && (
                  <p className="admin-muted">
                    Telegram: {telegramProfile.name}
                  </p>
                )}
            </div>
          </div>
          <nav className="admin-nav" aria-label="РљР°Р±РёРЅРµС‚">
            {user.role !== UserRole.CURATOR && (
              <Link className="button" href="/admin/curators">
                РђРґРјРёРЅРєР°
              </Link>
            )}
            <Link className="button" href="/">
              РќР° СЃР°Р№С‚
            </Link>
            <form action={logoutAction}>
              <button className="button" type="submit">
                Р’С‹Р№С‚Рё
              </button>
            </form>
          </nav>
        </header>

        <nav className="cabinet-section-menu" aria-label="Р Р°Р·РґРµР»С‹ РєР°Р±РёРЅРµС‚Р°">
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
                <span>{meta.label}</span>
                <small>{meta.description}</small>
              </Link>
            );
          })}
        </nav>

        <div className="admin-grid">
          {activeSection === "overview" && (
            <section className="admin-card admin-card--wide">
              <h2>Р РµС„РµСЂР°Р»СЊРЅР°СЏ СЃСЃС‹Р»РєР°</h2>
              <p className="admin-muted">
                РљР»РёРµРЅС‚С‹, РєРѕС‚РѕСЂС‹Рµ РїРµСЂРµР№РґСѓС‚ РїРѕ СЌС‚РѕР№ СЃСЃС‹Р»РєРµ, РїРѕРїР°РґСѓС‚ Рє РІР°Рј.
              </p>
              <a
                className="referral-link"
                href={referral}
                rel="noreferrer"
                target="_blank"
              >
                {referral}
              </a>
              {telegramMiniAppReferral && (
                <>
                  <p className="admin-muted">
                    РЎСЃС‹Р»РєР° РґР»СЏ Telegram Mini App: РєР»РёРµРЅС‚ СЃСЂР°Р·Сѓ РІРѕР№РґС‘С‚ РІ РєР°Р±РёРЅРµС‚,
                    Р° СЂРµС„РµСЂР°Р»СЊРЅС‹Р№ РєРѕРґ СЃРѕС…СЂР°РЅРёС‚СЃСЏ РёР· РїР°СЂР°РјРµС‚СЂР° startapp.
                  </p>
                  <a
                    className="referral-link"
                    href={telegramMiniAppReferral}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {telegramMiniAppReferral}
                  </a>
                </>
              )}
              {canViewClients ? (
                <div className="stats-grid">
                  <div>
                    <strong>{curator.orders.length}</strong>
                    <span>Р·Р°РєР°Р·РѕРІ</span>
                  </div>
                  <div>
                    <strong>{paidOrders.length}</strong>
                    <span>РѕРїР»Р°С‡РµРЅРѕ</span>
                  </div>
                  <div>
                    <strong>{paidAmount.toLocaleString("ru-RU")}</strong>
                    <span>СЂСѓР±.</span>
                  </div>
                </div>
              ) : (
                <p className="admin-muted">
                  РџСЂРѕСЃРјРѕС‚СЂ РєР»РёРµРЅС‚РѕРІ РѕС‚РєР»СЋС‡РµРЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј.
                </p>
              )}
            </section>
          )}

          {activeSection === "overview" && (
            <section className="admin-card admin-card--wide">
              <div className="admin-card__header">
                <div>
                  <h2>Р›РёС‡РЅС‹Рµ СЃСЃС‹Р»РєРё РґР»СЏ РїР°СЂС‚РЅС‘СЂРѕРІ</h2>
                  <p className="admin-muted">
                    РЎРѕР·РґР°РІР°Р№С‚Рµ РѕС‚РґРµР»СЊРЅСѓСЋ СЃСЃС‹Р»РєСѓ РґР»СЏ РєР»СѓР±Р°, РїР°СЂС‚РЅС‘СЂР° РёР»Рё РєР°РЅР°Р»Р°.
                    РџРµСЂРІС‹Р№ РїРµСЂРµС…РѕРґ Р·Р°РєСЂРµРїР»СЏРµС‚СЃСЏ Р·Р° РєР»РёРµРЅС‚РѕРј РґРѕ СЂРµРіРёСЃС‚СЂР°С†РёРё, Р°
                    РїРѕСЃР»Рµ СЂРµРіРёСЃС‚СЂР°С†РёРё Р°С‚СЂРёР±СѓС†РёСЏ СЃРѕС…СЂР°РЅСЏРµС‚СЃСЏ РЅР°РІСЃРµРіРґР°.
                  </p>
                </div>
              </div>

              <form
                action={createCabinetReferralLinkAction}
                className="admin-form filter-form"
              >
                <label className="field">
                  <span>РќР°Р·РІР°РЅРёРµ РёСЃС‚РѕС‡РЅРёРєР°</span>
                  <input
                    maxLength={120}
                    name="title"
                    placeholder="РќР°РїСЂРёРјРµСЂ: РљР»СѓР± Р РѕРјР°С€РєР°"
                    required
                    type="text"
                  />
                </label>
                <div className="filter-form__actions">
                  <button className="button button--primary" type="submit">
                    РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ СЃСЃС‹Р»РєСѓ
                  </button>
                </div>
              </form>

              <div className="participant-tools">
                <a className="button" href="/cabinet/referrals/export">
                  РЎРєР°С‡Р°С‚СЊ РІСЃСЋ Р±СѓС…РіР°Р»С‚РµСЂРёСЋ CSV
                </a>
              </div>

              <div className="table-wrap">
                <table className="admin-table referral-stats-table">
                  <thead>
                    <tr>
                      <th>РСЃС‚РѕС‡РЅРёРє</th>
                      <th>РЎСЃС‹Р»РєРё</th>
                      <th>РЎС‚Р°С‚РёСЃС‚РёРєР°</th>
                      <th>Р‘СѓС…РіР°Р»С‚РµСЂРёСЏ</th>
                      <th>QR</th>
                      <th>РЈРїСЂР°РІР»РµРЅРёРµ</th>
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
                            {link.active ? "РђРєС‚РёРІРЅР°" : "РћС‚РєР»СЋС‡РµРЅР°"}
                          </span>{" "}
                          <span className="badge badge--muted">
                            {link.isPrimary
                              ? "СЃСЃС‹Р»РєР° РѕС‚ Р°РґРјРёРЅР°"
                              : link.createdByCurator
                                ? "СЃСЃС‹Р»РєР° РєСѓСЂР°С‚РѕСЂР°"
                                : "СЃС‚Р°СЂР°СЏ СЃСЃС‹Р»РєР°"}
                          </span>
                        </td>
                        <td>
                          <a
                            href={link.webUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {link.webUrl}
                          </a>
                          {link.telegramUrl && (
                            <>
                              <br />
                              <a
                                href={link.telegramUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                Telegram: {link.telegramUrl}
                              </a>
                            </>
                          )}
                        </td>
                        <td>
                          Р’РёР·РёС‚РѕРІ: {link.stats.visits}
                          <br />
                          Р РµРіРёСЃС‚СЂР°С†РёР№: {link.stats.clients}
                          <br />
                          РџРѕРєСѓРїР°С‚РµР»РµР№: {link.stats.boughtClients}
                          <br />
                          РћРїР»Р°С‚: {link.stats.paidOrders}
                          <br />
                          РљРѕРЅРІРµСЂСЃРёСЏ: {link.conversion}%
                        </td>
                        <td>
                          РћРїР»Р°С‡РµРЅРѕ:{" "}
                          {formatMoney(link.stats.paidAmountRub, "RUB")}
                          <br />
                          Р’РѕР·РІСЂР°С‚С‹:{" "}
                          {formatMoney(link.stats.refundedAmountRub, "RUB")}
                          <br />
                          РС‚РѕРіРѕ: {formatMoney(link.netAmountRub, "RUB")}
                          <br />
                          <a
                            href={`/cabinet/referrals/export?slug=${encodeURIComponent(link.slug)}`}
                          >
                            РЎРєР°С‡Р°С‚СЊ CSV
                          </a>
                        </td>
                        <td>
                          <a href={link.qrUrl} rel="noreferrer" target="_blank">
                            РћС‚РєСЂС‹С‚СЊ QR
                          </a>
                        </td>
                        <td>
                          {link.isPrimary ? (
                            <span className="admin-muted">
                              РћСЃРЅРѕРІРЅР°СЏ СЃСЃС‹Р»РєР° СЂРµРґР°РєС‚РёСЂСѓРµС‚СЃСЏ Р°РґРјРёРЅРѕРј
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
                                  aria-label="РќР°Р·РІР°РЅРёРµ СЃСЃС‹Р»РєРё"
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
                                  РџРµСЂРµРёРјРµРЅРѕРІР°С‚СЊ
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
                                  {link.active ? "РћС‚РєР»СЋС‡РёС‚СЊ" : "Р’РєР»СЋС‡РёС‚СЊ"}
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
              <h2>РРЅС„РѕСЂРјР°С†РёСЏ РїРѕСЃР»Рµ РїРѕРєСѓРїРєРё</h2>
              {!curator.canEditPostPurchase && (
                <p className="admin-muted">
                  Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РёРЅС„РѕСЂРјР°С†РёРё РїРѕСЃР»Рµ РїРѕРєСѓРїРєРё РѕС‚РєР»СЋС‡РµРЅРѕ
                  Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј.
                </p>
              )}
              {!curator.canEditSupport && (
                <p className="admin-muted">
                  Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ РєРЅРѕРїРєРё РїРѕРґРґРµСЂР¶РєРё РѕС‚РєР»СЋС‡РµРЅРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј.
                </p>
              )}
              <form action={saveCabinetCuratorSettings} className="admin-form">
                <label className="field">
                  <span>Р—Р°РіРѕР»РѕРІРѕРє</span>
                  <input
                    defaultValue={curator.postPurchaseTitle ?? ""}
                    disabled={!curator.canEditPostPurchase}
                    name="postPurchaseTitle"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>РўРµРєСЃС‚ РґР»СЏ РєР»РёРµРЅС‚Р°</span>
                  <textarea
                    defaultValue={curator.postPurchaseText ?? ""}
                    disabled={!curator.canEditPostPurchase}
                    name="postPurchaseText"
                    rows={5}
                  />
                </label>
                <label className="field">
                  <span>РЎСЃС‹Р»РєР° РґР»СЏ РєР»РёРµРЅС‚Р°</span>
                  <input
                    defaultValue={curator.postPurchaseUrl ?? ""}
                    disabled={!curator.canEditPostPurchase}
                    name="postPurchaseUrl"
                    placeholder="https://t.me/..."
                    type="url"
                  />
                </label>
                <label className="field">
                  <span>РўРµРєСЃС‚ РєРЅРѕРїРєРё РІРѕРїСЂРѕСЃР°</span>
                  <input
                    defaultValue={curator.supportButtonLabel ?? ""}
                    disabled={!curator.canEditSupport}
                    name="supportButtonLabel"
                    placeholder="РќР°РїРёСЃР°С‚СЊ РІРѕРїСЂРѕСЃ РєСѓСЂР°С‚РѕСЂСѓ"
                    type="text"
                  />
                </label>
                <label className="field">
                  <span>РђРґСЂРµСЃ РґР»СЏ РІРѕРїСЂРѕСЃРѕРІ</span>
                  <input
                    defaultValue={curator.supportUrl ?? ""}
                    disabled={!curator.canEditSupport}
                    name="supportUrl"
                    placeholder="https://t.me/..., @username, email РёР»Рё С‚РµР»РµС„РѕРЅ"
                    type="text"
                  />
                </label>
                <p className="admin-muted">
                  РЎРµР№С‡Р°СЃ РєРЅРѕРїРєР°{" "}
                  {curator.supportEnabled ? "РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ" : "СЃРєСЂС‹С‚Р° Р°РґРјРёРЅРѕРј"}.
                </p>
                <label className="checkbox-field">
                  <input
                    defaultChecked={curator.showMailingConsentCheckbox}
                    name="showMailingConsentCheckbox"
                    type="checkbox"
                  />
                  <span>
                    РџРѕРєР°Р·С‹РІР°С‚СЊ С‡РµРєР±РѕРєСЃ СЃРѕРіР»Р°СЃРёСЏ РЅР° СЂР°СЃСЃС‹Р»РєСѓ РІ С„РѕСЂРјРµ Р·Р°СЏРІРєРё
                  </span>
                </label>
                <button className="button button--primary" type="submit">
                  РЎРѕС…СЂР°РЅРёС‚СЊ
                </button>
              </form>
            </section>
          )}

          {activeSection === "products" &&
            (serviceManagementAccess ? (
              <section className="admin-card admin-card--wide">
                <div className="admin-card__header">
                  <div>
                    <h2>РџСЂРѕРґСѓРєС‚С‹ Рё Р°Р±РѕРЅРµРјРµРЅС‚С‹</h2>
                    <p className="admin-muted">
                      РљРѕРјРїР°РєС‚РЅС‹Р№ СЃРїРёСЃРѕРє Р±РµР· Р±РѕР»СЊС€РёС… С„РѕСЂРј. РћС‚РєСЂРѕР№С‚Рµ РєР°СЂС‚РѕС‡РєСѓ,
                      С‡С‚РѕР±С‹ РёР·РјРµРЅРёС‚СЊ С†РµРЅС‹, РїРµСЂРµРІРѕРґС‹ Рё РѕР±СЂСЏРґС‹ РІРЅСѓС‚СЂРё СЂР°Р·РґРµР»Р°.
                    </p>
                  </div>
                  <div className="admin-card__actions">
                    <Link
                      className="button button--primary"
                      href="/admin/products/new"
                    >
                      РЎРѕР·РґР°С‚СЊ РїСЂРѕРґСѓРєС‚
                    </Link>
                  </div>
                </div>
                <ServiceEditorList services={managedServices} />
              </section>
            ) : (
              user.role === UserRole.CURATOR && (
                <section className="admin-card admin-card--wide">
                  <h2>РџСЂРѕРґСѓРєС‚С‹ Рё Р°Р±РѕРЅРµРјРµРЅС‚С‹</h2>
                  <p className="admin-muted">
                    РЈРїСЂР°РІР»РµРЅРёРµ РїСЂРѕРґСѓРєС‚Р°РјРё РѕС‚РєР»СЋС‡РµРЅРѕ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј.
                  </p>
                </section>
              )
            ))}

          {activeSection === "payments" && canManageCabinetPayments && (
            <section className="admin-card admin-card--wide">
              <h2>РЎРїРѕСЃРѕР±С‹ РѕРїР»Р°С‚С‹ Рё СЂРµРєРІРёР·РёС‚С‹</h2>
              <p className="admin-muted">
                Р’С‹Р±РµСЂРёС‚Рµ С‚РѕР»СЊРєРѕ РёР· СЃРїРѕСЃРѕР±РѕРІ, СЂР°Р·СЂРµС€РµРЅРЅС‹С… Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј, Рё
                Р·Р°РїРѕР»РЅРёС‚Рµ РёРЅСЃС‚СЂСѓРєС†РёРё РґР»СЏ РєР»РёРµРЅС‚РѕРІ РІР°С€РµР№ СЃСЃС‹Р»РєРё.
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
                          <span>РџРѕРєР°Р·С‹РІР°С‚СЊ СЌС‚РѕС‚ СЃРїРѕСЃРѕР± РєР»РёРµРЅС‚Р°Рј</span>
                        </label>
                        <label className="field">
                          <span>РРЅСЃС‚СЂСѓРєС†РёСЏ РєР»РёРµРЅС‚Сѓ</span>
                          <textarea
                            defaultValue={
                              provider.instructions?.instructions ?? ""
                            }
                            name={`instructions:${provider.code}`}
                            placeholder="РќР°РїСЂРёРјРµСЂ: РёСЃРїРѕР»СЊР·СѓР№С‚Рµ СЌС‚РѕС‚ СЃРїРѕСЃРѕР±, РµСЃР»Рё РЅРµ РїРѕР»СѓС‡Р°РµС‚СЃСЏ РѕРїР»Р°С‚РёС‚СЊ С‡РµСЂРµР· РїР»Р°С‚РµР¶РЅСѓСЋ С„РѕСЂРјСѓ."
                            rows={3}
                          />
                        </label>
                        {provider.isCustom && (
                          <>
                            <div className="field-grid">
                              <label className="field">
                                <span>Р‘Р°РЅРє</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.bankName ?? ""
                                  }
                                  name={`bankName:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>РџРѕР»СѓС‡Р°С‚РµР»СЊ</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.recipientName ?? ""
                                  }
                                  name={`recipientName:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>РљР°СЂС‚Р° РёР»Рё СЃС‡РµС‚</span>
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
                                <span>РўРµР»РµС„РѕРЅ</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.phone ?? ""
                                  }
                                  name={`phone:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>РљРѕРјРјРµРЅС‚Р°СЂРёР№ Рє РїР»Р°С‚РµР¶Сѓ</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.paymentComment ?? ""
                                  }
                                  name={`paymentComment:${provider.code}`}
                                  type="text"
                                />
                              </label>
                              <label className="field">
                                <span>РЎСЂРѕРє РїСЂРѕРІРµСЂРєРё</span>
                                <input
                                  defaultValue={
                                    provider.instructions?.verificationPeriod ??
                                    ""
                                  }
                                  name={`verificationPeriod:${provider.code}`}
                                  placeholder="РќР°РїСЂРёРјРµСЂ: РґРѕ 1 СЂР°Р±РѕС‡РµРіРѕ РґРЅСЏ"
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
                    РЎРѕС…СЂР°РЅРёС‚СЊ СЃРїРѕСЃРѕР±С‹ РѕРїР»Р°С‚С‹
                  </button>
                </form>
              ) : (
                <p className="admin-muted">
                  РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ РїРѕРєР° РЅРµ СЂР°Р·СЂРµС€РёР» СЃРїРѕСЃРѕР±С‹ РѕРїР»Р°С‚С‹ РґР»СЏ СЌС‚РѕРіРѕ
                  РєР°Р±РёРЅРµС‚Р°.
                </p>
              )}
            </section>
          )}

          {activeSection === "payments" &&
            canManageCabinetPayments &&
            canViewClients && (
              <section className="admin-card admin-card--wide">
                <h2>РћРїР»Р°С‚С‹ РЅР° РїСЂРѕРІРµСЂРєРµ</h2>
                <p className="admin-muted">
                  Р СѓС‡РЅРѕРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РїРµСЂРµРІРѕРґРёС‚ РєР°СЃС‚РѕРјРЅСѓСЋ РѕРїР»Р°С‚Сѓ РІ СЃС‚Р°С‚СѓСЃ
                  В«РѕРїР»Р°С‡РµРЅВ».
                </p>
                {awaitingCustomOrders.length > 0 ? (
                  <div className="table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Р—Р°РєР°Р·</th>
                          <th>РљР»РёРµРЅС‚</th>
                          <th>РџРѕРєСѓРїРєР°</th>
                          <th>РЎСѓРјРјР°</th>
                          <th>РћРїР»Р°С‚Р°</th>
                          <th>Р”Р°С‚Р°</th>
                          <th>Р”РµР№СЃС‚РІРёРµ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {awaitingCustomOrders.map((order) => (
                          <tr key={order.id}>
                            <td>#{order.orderNumber}</td>
                            <td>
                              <strong>{order.customerName}</strong>
                              <br />
                              {formatContacts(order) || "РљРѕРЅС‚Р°РєС‚С‹ РЅРµ СѓРєР°Р·Р°РЅС‹"}
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
                                  РџРѕРґС‚РІРµСЂРґРёС‚СЊ РѕРїР»Р°С‚Сѓ
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
                    РќРµС‚ РєР°СЃС‚РѕРјРЅС‹С… РѕРїР»Р°С‚, РѕР¶РёРґР°СЋС‰РёС… РїСЂРѕРІРµСЂРєРё.
                  </p>
                )}
              </section>
            )}

          {activeSection === "clients" && canViewClients && (
            <section className="admin-card admin-card--wide">
              <h2>РЈС‡Р°СЃС‚РЅРёРєРё РѕРїР»Р°С‡РµРЅРЅС‹С… Р·Р°РєР°Р·РѕРІ</h2>
              <form className="admin-form filter-form">
                <input name="section" type="hidden" value="clients" />
                <label className="field">
                  <span>Р”Р°С‚Р° СЃ</span>
                  <input
                    defaultValue={participantFilters.dateFrom}
                    name="dateFrom"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Р”Р°С‚Р° РїРѕ</span>
                  <input
                    defaultValue={participantFilters.dateTo}
                    name="dateTo"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Р¦РµСЂРµРјРѕРЅРёСЏ</span>
                  <select
                    defaultValue={participantFilters.serviceId}
                    name="serviceId"
                  >
                    <option value="">Р’СЃРµ С†РµСЂРµРјРѕРЅРёРё</option>
                    {participantServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>РЎС‚Р°С‚СѓСЃ РѕРїР»Р°С‚С‹</span>
                  <select defaultValue={OrderStatus.PAID} disabled>
                    <option value={OrderStatus.PAID}>
                      {formatStatus(OrderStatus.PAID)}
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>РСЃС‚РѕС‡РЅРёРє</span>
                  <select
                    defaultValue={participantFilters.sourceDomain}
                    name="sourceDomain"
                  >
                    <option value="">Р’СЃРµ РёСЃС‚РѕС‡РЅРёРєРё</option>
                    <option value="starvedas.ru">starvedas.ru</option>
                    <option value="chintamanidhama.ru">
                      chintamanidhama.ru
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Р РµС„РµСЂР°Р»СЊРЅР°СЏ СЃСЃС‹Р»РєР°</span>
                  <select
                    defaultValue={participantFilters.referralSlug}
                    name="referralSlug"
                  >
                    <option value="">Р’СЃРµ СЃСЃС‹Р»РєРё</option>
                    {referralLinkRows.map((link) => (
                      <option key={link.slug} value={link.slug}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filter-form__actions">
                  <button className="button button--primary" type="submit">
                    РџСЂРёРјРµРЅРёС‚СЊ С„РёР»СЊС‚СЂС‹
                  </button>
                  <Link className="button" href="/cabinet?section=clients">
                    РЎР±СЂРѕСЃРёС‚СЊ
                  </Link>
                </div>
              </form>
              <ParticipantsTable
                emptyText="РЈС‡Р°СЃС‚РЅРёРєРё РїРѕ РІС‹Р±СЂР°РЅРЅС‹Рј С„РёР»СЊС‚СЂР°Рј РЅРµ РЅР°Р№РґРµРЅС‹."
                participants={participants}
              />
            </section>
          )}

          {activeSection === "clients" && canViewClients && (
            <section className="admin-card admin-card--wide">
              <h2>РљР»РёРµРЅС‚СЃРєР°СЏ Р±Р°Р·Р° Рё СЂР°СЃСЃС‹Р»РєРё</h2>
              <p className="admin-muted">
                Р¤РёР»СЊС‚СЂС‹ РїРѕРјРѕРіР°СЋС‚ СЃРѕР±СЂР°С‚СЊ СЃРµРіРјРµРЅС‚С‹ РєР»РёРµРЅС‚РѕРІ РІР°С€РµРіРѕ РєР°Р±РёРЅРµС‚Р°.
                Р’С‹РіСЂСѓР·РєР° СЃРѕРґРµСЂР¶РёС‚ С‚РѕР»СЊРєРѕ РєРѕРЅС‚Р°РєС‚С‹ СЃ СЃРѕРіР»Р°СЃРёРµРј РЅР° СЂР°СЃСЃС‹Р»РєРё.
              </p>
              <form className="admin-form filter-form">
                <input name="section" type="hidden" value="clients" />
                <label className="field">
                  <span>Р”Р°С‚Р° СЃС‚Р°С‚СѓСЃР° СЃ</span>
                  <input
                    defaultValue={clientFilters.dateFrom}
                    name="clientDateFrom"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>Р”Р°С‚Р° СЃС‚Р°С‚СѓСЃР° РїРѕ</span>
                  <input
                    defaultValue={clientFilters.dateTo}
                    name="clientDateTo"
                    type="date"
                  />
                </label>
                <label className="field">
                  <span>РЎРµРіРјРµРЅС‚</span>
                  <select
                    defaultValue={clientFilters.status ?? ""}
                    name="clientStatus"
                  >
                    <option value="">Р’СЃРµ СЃРµРіРјРµРЅС‚С‹</option>
                    {clientStatuses.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Р Р°СЃСЃС‹Р»РєР°</span>
                  <select
                    defaultValue={clientFilters.consent}
                    name="clientConsent"
                  >
                    <option value="">Р’СЃРµ</option>
                    <option value="yes">Р•СЃС‚СЊ СЃРѕРіР»Р°СЃРёРµ</option>
                    <option value="no">РќРµС‚ СЃРѕРіР»Р°СЃРёСЏ</option>
                  </select>
                </label>
                <label className="field">
                  <span>Р¦РµСЂРµРјРѕРЅРёСЏ</span>
                  <select
                    defaultValue={clientFilters.serviceId}
                    name="clientServiceId"
                  >
                    <option value="">Р’СЃРµ С†РµСЂРµРјРѕРЅРёРё</option>
                    {clientServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>РСЃС‚РѕС‡РЅРёРє</span>
                  <select
                    defaultValue={clientFilters.sourceDomain}
                    name="clientSourceDomain"
                  >
                    <option value="">Р’СЃРµ РёСЃС‚РѕС‡РЅРёРєРё</option>
                    <option value="starvedas.ru">starvedas.ru</option>
                    <option value="chintamanidhama.ru">
                      chintamanidhama.ru
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>Р РµС„РµСЂР°Р»СЊРЅР°СЏ СЃСЃС‹Р»РєР°</span>
                  <select
                    defaultValue={clientFilters.referralSlug}
                    name="clientReferralSlug"
                  >
                    <option value="">Р’СЃРµ СЃСЃС‹Р»РєРё</option>
                    {referralLinkRows.map((link) => (
                      <option key={link.slug} value={link.slug}>
                        {link.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="filter-form__actions">
                  <button className="button button--primary" type="submit">
                    РџСЂРёРјРµРЅРёС‚СЊ С„РёР»СЊС‚СЂС‹
                  </button>
                  <Link className="button" href="/cabinet?section=clients">
                    РЎР±СЂРѕСЃРёС‚СЊ
                  </Link>
                </div>
              </form>
              <ClientsTable
                clients={clients}
                emptyText="РљР»РёРµРЅС‚С‹ РїРѕ РІС‹Р±СЂР°РЅРЅС‹Рј СЃРµРіРјРµРЅС‚Р°Рј РЅРµ РЅР°Р№РґРµРЅС‹."
              />
            </section>
          )}

          {activeSection === "clients" && (
            <section className="admin-card admin-card--wide">
              <h2>РљР»РёРµРЅС‚С‹ Рё РїРѕРєСѓРїРєРё</h2>
              {!canViewClients ? (
                <p className="admin-muted">
                  РџСЂРѕСЃРјРѕС‚СЂ РєР»РёРµРЅС‚РѕРІ Рё РїРѕРєСѓРїРѕРє РѕС‚РєР»СЋС‡РµРЅ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂРѕРј.
                </p>
              ) : curator.orders.length > 0 ? (
                <div className="table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Р—Р°РєР°Р·</th>
                        <th>РљР»РёРµРЅС‚</th>
                        <th>РџРѕРєСѓРїРєР°</th>
                        <th>РЎСѓРјРјР°</th>
                        <th>РЎС‚Р°С‚СѓСЃ</th>
                        <th>РљРѕРЅС‚Р°РєС‚С‹</th>
                        <th>Р”Р°С‚Р°</th>
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
                          <td>{formatContacts(order) || "РќРµ СѓРєР°Р·Р°РЅС‹"}</td>
                          <td>{order.createdAt.toLocaleDateString("ru-RU")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-muted">РљР»РёРµРЅС‚РѕРІ РїРѕРєР° РЅРµС‚.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
