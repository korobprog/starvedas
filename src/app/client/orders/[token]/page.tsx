import type { Metadata } from "next";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientAuthRequired } from "@/components/client-auth-required";
import { formatMoney } from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import { normalizeProdamusPaymentUrl } from "@/server/payform";
import { applySiteBrandToText } from "@/lib/site-branding";
import { formatStatus } from "@/lib/status-labels";
import { canClientEditOrderStatus } from "@/server/client-order-permissions";
import { getCurrentClientProfile } from "@/server/client-auth";
import { getRequestSiteBrand } from "@/server/site-branding";

export const dynamic = "force-dynamic";

function buildRepeatHref(order: {
  curator: { slug: string };
  publicToken: string;
  referralSlug: string | null;
}) {
  const params = new URLSearchParams({ repeat: order.publicToken });

  params.set("ref", order.referralSlug || order.curator.slug);

  return `/?${params.toString()}#signup`;
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    year: "numeric"
  }).format(value);
}

function formatMoscowDateTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "long",
    timeZone: "Europe/Moscow",
    year: "numeric"
  }).format(value);
}

function formatDayCount(days: number) {
  const normalizedDays = Math.max(0, days);
  const lastTwoDigits = normalizedDays % 100;
  const lastDigit = normalizedDays % 10;
  const label =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? "дней"
      : lastDigit === 1
        ? "день"
        : lastDigit >= 2 && lastDigit <= 4
          ? "дня"
          : "дней";

  return `${normalizedDays} ${label}`;
}

function getSubscriptionValidity(order: {
  isSubscriptionSnapshot: boolean;
  subscriptionEndsAtSnapshot: Date | null;
  subscriptionStartsAtSnapshot: Date | null;
}) {
  if (
    !order.isSubscriptionSnapshot ||
    !order.subscriptionStartsAtSnapshot ||
    !order.subscriptionEndsAtSnapshot
  ) {
    return null;
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startsAt = order.subscriptionStartsAtSnapshot;
  const endsAt = order.subscriptionEndsAtSnapshot;
  const status =
    endsAt.getTime() < now.getTime()
      ? "Срок действия истёк"
      : startsAt.getTime() > now.getTime()
        ? `Начнётся через ${formatDayCount(
            Math.ceil((startsAt.getTime() - now.getTime()) / dayMs)
          )}`
        : `Осталось ${formatDayCount(
            Math.ceil((endsAt.getTime() - now.getTime()) / dayMs)
          )}`;

  return {
    period: `с ${formatMoscowDateTime(startsAt)} до ${formatMoscowDateTime(
      endsAt
    )}`,
    status
  };
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

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestSiteBrand();

  return {
    robots: {
      follow: false,
      index: false
    },
    title: applySiteBrandToText("Покупка клиента, StarVedas", brand.name)
  };
}

export default async function ClientOrderDetailPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const [client, { token }] = await Promise.all([
    getCurrentClientProfile(),
    params
  ]);

  if (!client) {
    return (
      <ClientAuthRequired
        nextPath={`/client/orders/${encodeURIComponent(token)}`}
        title="Войдите, чтобы открыть покупку"
      />
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      clientId: client.id,
      deletedAt: null,
      publicToken: token
    },
    select: {
      amountRub: true,
      createdAt: true,
      currency: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      curator: {
        select: {
          name: true,
          postPurchaseText: true,
          postPurchaseTitle: true,
          postPurchaseUrl: true,
          slug: true,
          supportButtonLabel: true,
          supportEnabled: true,
          supportUrl: true
        }
      },
      isSubscriptionSnapshot: true,
      leadStatus: true,
      orderNumber: true,
      participantCount: true,
      participants: {
        orderBy: { sortOrder: "asc" },
        select: {
          fullName: true,
          rowStatus: true,
          statisticianComment: true
        }
      },
      payment: {
        select: {
          createdAt: true,
          paidAt: true,
          paymentUrl: true,
          provider: true,
          receiptLabel: true,
          receiptUploadedAt: true,
          receiptUrl: true,
          status: true
        }
      },
      publicToken: true,
      referralSlug: true,
      service: {
        select: {
          title: true
        }
      },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: {
          priceRubSnapshot: true,
          quantitySnapshot: true,
          titleSnapshot: true,
          totalRubSnapshot: true
        }
      },
      status: true,
      subscriptionEndsAtSnapshot: true,
      subscriptionStartsAtSnapshot: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          fromStatus: true,
          note: true,
          toStatus: true
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  const paymentUrl = normalizeProdamusPaymentUrl(order.payment?.paymentUrl);
  const optionTitles = order.serviceOptions.map(
    (option) => option.titleSnapshot
  );
  const subscriptionValidity = getSubscriptionValidity(order);
  const isPaymentConfirmed =
    order.status === OrderStatus.PAID &&
    order.payment?.status === PaymentStatus.SUCCEEDED;
  const hasPostPurchaseContent = Boolean(
    order.curator.postPurchaseTitle ||
    order.curator.postPurchaseText ||
    order.curator.postPurchaseUrl ||
    order.payment?.receiptUrl
  );

  return (
    <main className="page-shell">
      <section className="content-section content-section--narrow">
        <div className="section-heading">
          <p className="eyebrow">Заказ №{order.orderNumber}</p>
          <h1>{order.service.title}</h1>
          <p>Детали покупки: статус, оплата, участники и связь с куратором.</p>
        </div>

        <div className="form-actions">
          <Link className="button" href="/client">
            Назад в кабинет
          </Link>
          <Link
            className="button button--primary"
            href={buildRepeatHref(order)}
          >
            Повторить покупку
          </Link>
          {canClientEditOrderStatus(order) && (
            <Link
              className="button"
              href={`/client/orders/${order.publicToken}/edit`}
            >
              Редактировать
            </Link>
          )}
          {paymentUrl && order.status !== "PAID" && (
            <a className="button" href={paymentUrl}>
              Перейти к оплате
            </a>
          )}
        </div>
      </section>

      <section className="content-section content-section--narrow client-detail-grid">
        <article className="client-order-card">
          <h2>Церемония</h2>
          <dl className="summary-list">
            <div>
              <dt>Дата оформления</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
            {subscriptionValidity && (
              <div>
                <dt>Абонемент</dt>
                <dd>
                  {subscriptionValidity.period}
                  <br />
                  <span className="form-note">
                    {subscriptionValidity.status}
                  </span>
                </dd>
              </div>
            )}
            <div>
              <dt>Статус заказа</dt>
              <dd>{formatStatus(order.status)}</dd>
            </div>
            <div>
              <dt>Статус работы</dt>
              <dd>{formatStatus(order.leadStatus)}</dd>
            </div>
            <div>
              <dt>Сумма</dt>
              <dd>{formatMoney(order.amountRub, order.currency)}</dd>
            </div>
          </dl>
          {optionTitles.length > 0 && (
            <ul className="rite-summary-list">
              {optionTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          )}
        </article>

        <article className="client-order-card">
          <h2>Оплата</h2>
          <dl className="summary-list">
            <div>
              <dt>Статус оплаты</dt>
              <dd>
                {order.payment?.status
                  ? formatStatus(order.payment.status)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Провайдер</dt>
              <dd>{order.payment?.provider ?? "—"}</dd>
            </div>
            <div>
              <dt>Дата оплаты</dt>
              <dd>
                {order.payment?.paidAt
                  ? formatDateTime(order.payment.paidAt)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Чек / квитанция</dt>
              <dd>
                {order.payment?.receiptUrl ? (
                  <a
                    href={order.payment.receiptUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {order.payment.receiptLabel || "Открыть чек"}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          {order.payment?.receiptUploadedAt && (
            <p className="form-note">
              Чек добавлен: {formatDateTime(order.payment.receiptUploadedAt)}
            </p>
          )}
          {paymentUrl && order.status !== "PAID" && (
            <a className="button button--primary" href={paymentUrl}>
              Перейти к оплате
            </a>
          )}
        </article>

        {isPaymentConfirmed && hasPostPurchaseContent && (
          <article className="client-order-card client-order-card--highlight">
            <h2>После оплаты</h2>
            <p className="form-note">
              Эти данные открываются только после подтверждения оплаты.
            </p>
            {order.curator.postPurchaseTitle && (
              <h3>{order.curator.postPurchaseTitle}</h3>
            )}
            {order.curator.postPurchaseText && (
              <p>{order.curator.postPurchaseText}</p>
            )}
            {order.payment?.receiptUrl && (
              <p>
                <a
                  href={order.payment.receiptUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {order.payment.receiptLabel || "Открыть чек"}
                </a>
              </p>
            )}
            {order.curator.postPurchaseUrl && (
              <a
                className="button button--primary"
                href={order.curator.postPurchaseUrl}
                rel="noreferrer"
                target="_blank"
              >
                Открыть ссылку куратора
              </a>
            )}
          </article>
        )}

        <article className="client-order-card">
          <h2>Участники</h2>
          <p className="form-note">
            Всего участников: {order.participantCount}
          </p>
          <ol className="client-participant-list">
            {order.participants.map((participant) => (
              <li key={participant.fullName}>
                <span>{participant.fullName}</span>
                <small>{formatStatus(participant.rowStatus)}</small>
                {participant.statisticianComment && (
                  <p>{participant.statisticianComment}</p>
                )}
              </li>
            ))}
          </ol>
        </article>

        <article className="client-order-card">
          <h2>Контакты</h2>
          <dl className="summary-list">
            <div>
              <dt>Заказчик</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt>Контакты</dt>
              <dd>{formatContacts(order) || "Не указаны"}</dd>
            </div>
          </dl>
        </article>

        <article className="client-order-card">
          <h2>Мой куратор</h2>
          <p>{order.curator.name}</p>
          {order.curator.supportEnabled && order.curator.supportUrl ? (
            <a
              className="button button--primary"
              href={order.curator.supportUrl}
              rel="noreferrer"
              target="_blank"
            >
              {order.curator.supportButtonLabel || "Связаться с куратором"}
            </a>
          ) : (
            <p className="form-note">
              Канал связи с куратором появится после настройки кабинета.
            </p>
          )}
        </article>

        <article className="client-order-card">
          <h2>История изменений</h2>
          {order.statusHistory.length > 0 ? (
            <ol className="client-timeline">
              {order.statusHistory.map((item) => (
                <li key={`${item.createdAt.toISOString()}-${item.toStatus}`}>
                  <strong>{formatStatus(item.toStatus)}</strong>
                  <span>{formatDateTime(item.createdAt)}</span>
                  {item.note && <p>{item.note}</p>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="form-note">
              История появится после изменения статуса.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
