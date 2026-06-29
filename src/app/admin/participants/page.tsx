import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { ParticipantsTable } from "@/components/participants-table";
import { formatStatus } from "@/lib/status-labels";
import { prisma } from "@/lib/prisma";
import {
  confirmCustomPaymentAction,
  savePaymentReceiptAction
} from "@/server/order-actions";
import { customPaymentProviderCodes } from "@/server/payment-providers";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const orderStatuses = [
  OrderStatus.PAID,
  OrderStatus.WAITING_PAYMENT_VERIFICATION,
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.FAILED,
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED
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
  return orderStatuses.find((status) => status === value);
}

function parseFilters(searchParams: SearchParams | undefined) {
  const dateFrom = firstParam(searchParams?.dateFrom);
  const dateTo = firstParam(searchParams?.dateTo);

  return {
    curatorId: firstParam(searchParams?.curatorId) || "",
    dateFrom: dateFrom || "",
    dateTo: dateTo || "",
    serviceId: firstParam(searchParams?.serviceId) || "",
    sourceDomain: firstParam(searchParams?.sourceDomain) || "",
    status: parseStatus(firstParam(searchParams?.status))
  };
}

function buildOrderWhere(filters: ReturnType<typeof parseFilters>) {
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
    curatorId: filters.curatorId || undefined,
    deletedAt: null,
    serviceId: filters.serviceId || undefined,
    sourceDomain: filters.sourceDomain || undefined,
    status: filters.status
  } satisfies Prisma.OrderWhereInput;
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

export default async function AdminParticipantsPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const filters = parseFilters(await searchParams);
  const orderWhere = buildOrderWhere(filters);
  const [participants, curators, services, awaitingOrders] = await Promise.all([
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
    prisma.curator.findMany({
      orderBy: [
        { isSystem: "desc" },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: {
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
    prisma.order.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        amountRub: true,
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
    })
  ]);

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <h2>Проверка кастомных оплат</h2>
        <p className="admin-muted">
          Подтверждение переводит заказ из «ожидает проверки оплаты» в
          «оплачен».
        </p>
        {awaitingOrders.length > 0 ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Заказ</th>
                  <th>Клиент</th>
                  <th>Куратор</th>
                  <th>Покупка</th>
                  <th>Сумма</th>
                  <th>Оплата</th>
                  <th>Дата</th>
                  <th>Чек</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {awaitingOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.orderNumber}</td>
                    <td>
                      <strong>{order.customerName}</strong>
                      <br />
                      {formatContacts(order) || "Контакты не указаны"}
                    </td>
                    <td>{order.curator.name}</td>
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
                    <td>{order.amountRub.toLocaleString("ru-RU")} руб.</td>
                    <td>
                      {order.payment?.provider} /{" "}
                      {order.payment?.status
                        ? formatStatus(order.payment.status)
                        : formatStatus(order.status)}
                    </td>
                    <td>{order.createdAt.toLocaleDateString("ru-RU")}</td>
                    <td>
                      <form
                        action={savePaymentReceiptAction}
                        className="receipt-form"
                      >
                        <input name="orderId" type="hidden" value={order.id} />
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
                        <button className="button button--small" type="submit">
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
                        <input name="orderId" type="hidden" value={order.id} />
                        <button className="button button--small" type="submit">
                          Подтвердить оплату
                        </button>
                      </form>
                      <Link
                        aria-label="Restore order"
                        className="icon-button"
                        href={`/admin/recovery?backupOrder=${order.id}`}
                        title="Restore order"
                      >
                        {"\u21BA"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-muted">Нет кастомных оплат на проверке.</p>
        )}
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Участники</h2>
        <form className="admin-form filter-form">
          <label className="field">
            <span>Дата с</span>
            <input
              defaultValue={filters.dateFrom}
              name="dateFrom"
              type="date"
            />
          </label>
          <label className="field">
            <span>Дата по</span>
            <input defaultValue={filters.dateTo} name="dateTo" type="date" />
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
            <span>Статус оплаты</span>
            <select defaultValue={filters.status ?? ""} name="status">
              <option value="">Все статусы</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
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
            <Link className="button" href="/admin/participants">
              Сбросить
            </Link>
          </div>
        </form>
        <ParticipantsTable
          emptyText="Участники по выбранным фильтрам не найдены."
          participants={participants}
          showRecoveryLinks
        />
      </section>
    </div>
  );
}
