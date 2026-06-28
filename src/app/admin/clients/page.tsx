import { ClientFunnelStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ClientsTable } from "@/components/clients-table";
import { formatStatus } from "@/lib/status-labels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const clientStatuses = [
  ClientFunnelStatus.VISITED,
  ClientFunnelStatus.STARTED_CHECKOUT,
  ClientFunnelStatus.DID_NOT_BUY,
  ClientFunnelStatus.BOUGHT
] as const;

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

function parseStatus(value: string | undefined) {
  return clientStatuses.find((status) => status === value);
}

function parseConsent(value: string | undefined) {
  return value === "yes" || value === "no" ? value : "";
}

function parseFilters(searchParams: SearchParams | undefined) {
  const dateFrom = firstParam(searchParams?.dateFrom);
  const dateTo = firstParam(searchParams?.dateTo);

  return {
    consent: parseConsent(firstParam(searchParams?.consent)),
    curatorId: firstParam(searchParams?.curatorId) || "",
    dateFrom: dateFrom || "",
    dateTo: dateTo || "",
    serviceId: firstParam(searchParams?.serviceId) || "",
    sourceDomain: firstParam(searchParams?.sourceDomain) || "",
    status: parseStatus(firstParam(searchParams?.status))
  };
}

function buildClientWhere(filters: ReturnType<typeof parseFilters>) {
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
    curatorId: filters.curatorId || undefined,
    orders: filters.serviceId
      ? {
          some: {
            serviceId: filters.serviceId
          }
        }
      : undefined,
    sourceDomain: filters.sourceDomain || undefined,
    status: filters.status,
    updatedAt: Object.keys(updatedAt).length ? updatedAt : undefined
  } satisfies Prisma.ClientProfileWhereInput;
}

function getSegmentCount(
  clients: Array<{ status: ClientFunnelStatus }>,
  status: ClientFunnelStatus
) {
  return clients.filter((client) => client.status === status).length;
}

export default async function AdminClientsPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const rawSearchParams = await searchParams;
  const filters = parseFilters(rawSearchParams);
  const where = buildClientWhere(filters);
  const [clients, curators, services] = await Promise.all([
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
              orderBy: {
                sortOrder: "asc"
              },
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
    prisma.curator.findMany({
      orderBy: [
        { isSystem: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: {
        id: true,
        name: true,
        active: true
      }
    }),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true
      }
    })
  ]);

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <h2>Клиентская база и рассылки</h2>
        <p className="admin-muted">
          Сегменты строятся по воронке клиента, согласию на рассылку, куратору и
          покупкам. Выгрузка содержит только контакты с согласием.
        </p>
        <div className="stats-grid">
          {clientStatuses.map((status) => (
            <div key={status}>
              <strong>{getSegmentCount(clients, status)}</strong>
              <span>{formatStatus(status)}</span>
            </div>
          ))}
        </div>
        {firstParam(rawSearchParams?.transferred) && (
          <p className="admin-success">
            Клиенты переведены: {firstParam(rawSearchParams?.transferred)}
          </p>
        )}
        {firstParam(rawSearchParams?.transferError) && (
          <p className="form-warning">
            Не удалось перевести клиентов. Выберите клиентов и активного
            куратора.
          </p>
        )}
        <form className="admin-form filter-form">
          <label className="field">
            <span>Дата статуса с</span>
            <input
              defaultValue={filters.dateFrom}
              name="dateFrom"
              type="date"
            />
          </label>
          <label className="field">
            <span>Дата статуса по</span>
            <input defaultValue={filters.dateTo} name="dateTo" type="date" />
          </label>
          <label className="field">
            <span>Сегмент</span>
            <select defaultValue={filters.status ?? ""} name="status">
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
            <select defaultValue={filters.consent} name="consent">
              <option value="">Все</option>
              <option value="yes">Есть согласие</option>
              <option value="no">Нет согласия</option>
            </select>
          </label>
          <label className="field">
            <span>Куратор</span>
            <select defaultValue={filters.curatorId} name="curatorId">
              <option value="">Все кураторы</option>
              {curators.map((curator) => (
                <option key={curator.id} value={curator.id}>
                  {curator.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Церемония</span>
            <select defaultValue={filters.serviceId} name="serviceId">
              <option value="">Все церемонии</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Источник</span>
            <select defaultValue={filters.sourceDomain} name="sourceDomain">
              <option value="">Все источники</option>
              <option value="starvedas.ru">starvedas.ru</option>
              <option value="chintamanidhama.ru">chintamanidhama.ru</option>
            </select>
          </label>
          <div className="filter-form__actions">
            <button className="button button--primary" type="submit">
              Применить фильтры
            </button>
            <Link className="button" href="/admin/clients">
              Сбросить
            </Link>
          </div>
        </form>
        <ClientsTable
          clients={clients}
          curators={curators.filter((curator) => curator.active)}
          emptyText="Клиенты по выбранным сегментам не найдены."
        />
      </section>
    </div>
  );
}
