import Link from "next/link";
import { TelegramMiniAppAutoLogin } from "@/components/telegram-mini-app-auto-login";
import { formatMoney } from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import { formatStatus } from "@/lib/status-labels";
import { canClientEditOrderStatus } from "@/server/client-order-permissions";
import { getCurrentClientProfile } from "@/server/client-auth";

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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(value);
}

export default async function ClientCabinetPage() {
  const client = await getCurrentClientProfile();

  if (!client) {
    return (
      <main className="page-shell client-cabinet-shell">
        <section className="content-section content-section--narrow client-cabinet-section">
          <div className="section-heading">
            <p className="eyebrow">Личный кабинет</p>
            <h1>Войдите через Telegram</h1>
            <p>
              Откройте кабинет из Telegram Mini App, чтобы увидеть купленные
              абонементы и повторить прошлую заявку без повторного ввода данных.
            </p>
          </div>
          <TelegramMiniAppAutoLogin />
          <div className="form-actions client-cabinet-actions client-login-actions">
            <Link className="button button--primary" href="/client/register">
              Зарегистрироваться
            </Link>
            <Link className="button" href="/login?next=%2Fclient">
              Войти по email
            </Link>
            <Link className="button" href="/#signup">
              Перейти к форме записи
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [orders, savedParticipants] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      where: { clientId: client.id },
      select: {
        amountRub: true,
        createdAt: true,
        currency: true,
        curator: {
          select: {
            name: true,
            slug: true,
            supportButtonLabel: true,
            supportEnabled: true,
            supportUrl: true
          }
        },
        customerEmail: true,
        customerPhone: true,
        customerTelegram: true,
        leadStatus: true,
        orderNumber: true,
        participantCount: true,
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
            titleSnapshot: true
          }
        },
        status: true,
        payment: {
          select: {
            paymentUrl: true,
            status: true
          }
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            note: true,
            toStatus: true
          },
          take: 1
        }
      }
    }),
    prisma.savedParticipant.findMany({
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        fullName: true,
        id: true
      },
      take: 30,
      where: { clientId: client.id }
    })
  ]);

  return (
    <main className="page-shell client-cabinet-shell">
      <section className="content-section content-section--narrow client-cabinet-section client-cabinet-section--hero">
        <div className="section-heading">
          <p className="eyebrow">Личный кабинет</p>
          <h1>{client.name}</h1>
          <p>
            Здесь сохраняются ваши контакты и прошлые абонементы. Любой заказ
            можно повторить: форма заполнится автоматически, останется только
            проверить данные и оплатить.
          </p>
        </div>

        <div className="client-dashboard-grid client-summary-grid">
          <div className="telegram-auth-card">
            <strong>{client.telegram ?? "Профиль клиента"}</strong>
            <p>
              Контакты:{" "}
              {[client.phone, client.email].filter(Boolean).join(", ") ||
                "можно добавить в профиле"}
            </p>
            <Link className="button" href="/client/profile">
              Редактировать профиль
            </Link>
          </div>

          <div className="telegram-auth-card">
            <strong>Мой куратор</strong>
            {client.curator ? (
              <>
                <p>{client.curator.name}</p>
                {client.curator.supportEnabled && client.curator.supportUrl && (
                  <a
                    className="button"
                    href={client.curator.supportUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {client.curator.supportButtonLabel || "Связаться"}
                  </a>
                )}
              </>
            ) : (
              <p>Куратор появится после первой записи.</p>
            )}
          </div>
        </div>

        <div className="form-actions client-cabinet-actions">
          <Link className="button button--primary" href="/#signup">
            Купить новый абонемент
          </Link>
          <Link className="button" href="/client/profile">
            Профиль
          </Link>
          <Link className="button" href="/client/logout">
            Выйти
          </Link>
        </div>
      </section>

      <section className="content-section content-section--narrow client-cabinet-section">
        <div className="section-heading">
          <h2>Уведомления</h2>
          <p>Последние изменения по вашим заказам.</p>
        </div>
        {orders.some((order) => order.statusHistory.length > 0) ? (
          <div className="client-order-list">
            {orders
              .filter((order) => order.statusHistory.length > 0)
              .slice(0, 3)
              .map((order) => {
                const item = order.statusHistory[0];

                return (
                  <article
                    className="telegram-auth-card"
                    key={order.orderNumber}
                  >
                    <strong>
                      Заказ №{order.orderNumber}: {formatStatus(item.toStatus)}
                    </strong>
                    <p>{formatDate(item.createdAt)}</p>
                    {item.note && <p>{item.note}</p>}
                    <Link
                      className="button"
                      href={`/client/orders/${order.publicToken}`}
                    >
                      Открыть покупку
                    </Link>
                  </article>
                );
              })}
          </div>
        ) : (
          <div className="telegram-auth-card">
            <strong>Пока нет уведомлений</strong>
            <p>Когда статус заказа изменится, сообщение появится здесь.</p>
          </div>
        )}
      </section>

      <section className="content-section content-section--narrow client-cabinet-section">
        <div className="section-heading">
          <h2>Сохранённые участники</h2>
          <p>
            Эти имена можно быстро добавить в новую заявку на шаге «Участники».
          </p>
        </div>
        {savedParticipants.length > 0 ? (
          <div className="saved-participants-list">
            {savedParticipants.map((participant) => (
              <span className="badge badge--muted" key={participant.id}>
                {participant.fullName}
              </span>
            ))}
          </div>
        ) : (
          <div className="telegram-auth-card">
            <strong>Список пока пуст</strong>
            <p>Участники сохранятся после первой заявки.</p>
          </div>
        )}
      </section>

      <section className="content-section content-section--narrow client-cabinet-section">
        <div className="section-heading">
          <h2>Мои абонементы</h2>
          <p>История заявок, оплат и быстрый повтор прошлых абонементов.</p>
        </div>

        {orders.length > 0 ? (
          <div className="client-order-list">
            {orders.map((order) => {
              const optionTitles = order.serviceOptions.map(
                (option) => option.titleSnapshot
              );
              const paymentUrl = order.payment?.paymentUrl;

              return (
                <article className="client-order-card" key={order.orderNumber}>
                  <div>
                    <p className="eyebrow">Заказ №{order.orderNumber}</p>
                    <h3>{order.service.title}</h3>
                    {optionTitles.length > 0 && (
                      <p className="form-note">{optionTitles.join(", ")}</p>
                    )}
                  </div>

                  <dl className="summary-list">
                    <div>
                      <dt>Дата</dt>
                      <dd>{formatDate(order.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Статус</dt>
                      <dd>{formatStatus(order.status)}</dd>
                    </div>
                    <div>
                      <dt>Оплата</dt>
                      <dd>
                        {order.payment?.status
                          ? formatStatus(order.payment.status)
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Участники</dt>
                      <dd>{order.participantCount}</dd>
                    </div>
                    <div>
                      <dt>Сумма</dt>
                      <dd>{formatMoney(order.amountRub, order.currency)}</dd>
                    </div>
                    <div>
                      <dt>Куратор</dt>
                      <dd>{order.curator.name}</dd>
                    </div>
                  </dl>

                  <div className="form-actions">
                    <Link
                      className="button button--primary"
                      href={`/client/orders/${order.publicToken}`}
                    >
                      Подробнее
                    </Link>
                    <Link className="button" href={buildRepeatHref(order)}>
                      Повторить абонемент
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
                    {order.curator.supportEnabled &&
                      order.curator.supportUrl && (
                        <a
                          className="button"
                          href={order.curator.supportUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {order.curator.supportButtonLabel || "Задать вопрос"}
                        </a>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="telegram-auth-card">
            <strong>Пока нет абонементов</strong>
            <p>После первой записи и оплаты абонемент появится здесь.</p>
            <Link className="button button--primary" href="/#signup">
              Записаться
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
