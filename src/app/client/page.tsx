import Link from "next/link";
import { TelegramMiniAppAutoLogin } from "@/components/telegram-mini-app-auto-login";
import { formatMoney } from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import { normalizeProdamusPaymentUrl } from "@/server/payform";
import { formatStatus } from "@/lib/status-labels";
import { canClientEditOrderStatus } from "@/server/client-order-permissions";
import { getCurrentClientProfile } from "@/server/client-auth";
import { clientLogoutAction } from "@/server/client-logout-actions";

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

function formatDateTime(value: Date) {
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
    period: `с ${formatDateTime(startsAt)} до ${formatDateTime(endsAt)}`,
    status
  };
}

export default async function ClientCabinetPage() {
  const client = await getCurrentClientProfile();

  if (!client) {
    return (
      <main className="page-shell client-cabinet-shell">
        <style>{`
          .client-cabinet-shell {
            display: grid !important;
            align-content: start !important;
            gap: clamp(18px, 3vw, 28px) !important;
            width: min(1080px, 100%) !important;
            margin: 0 auto !important;
            padding: max(28px, env(safe-area-inset-top, 0px)) clamp(18px, 4vw, 36px)
              max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px)) !important;
            overflow-x: hidden !important;
          }

          .client-cabinet-section--login {
            justify-self: center !important;
            display: grid !important;
            gap: 18px !important;
            width: min(760px, 100%) !important;
            max-width: calc(100vw - 32px) !important;
            margin-top: clamp(12px, 7vh, 64px) !important;
            border: 1px solid var(--border) !important;
            border-radius: 30px !important;
            padding: clamp(24px, 5vw, 44px) !important;
            background:
              linear-gradient(135deg, rgb(255 255 255 / 88%), rgb(255 244 223 / 82%)),
              var(--surface) !important;
            box-shadow: var(--shadow) !important;
          }

          .client-cabinet-section--login .section-heading {
            display: grid !important;
            gap: 10px !important;
            text-align: center !important;
          }

          .client-cabinet-section--login .section-heading h1,
          .client-cabinet-section--login .section-heading p,
          .client-cabinet-section--login .section-heading .eyebrow {
            max-width: 100% !important;
            margin: 0 !important;
            overflow-wrap: anywhere !important;
            text-wrap: balance !important;
          }

          .client-cabinet-section--login .section-heading h1 {
            font-size: clamp(2.2rem, 6vw, 3.8rem) !important;
            line-height: 1.04 !important;
          }

          .client-cabinet-section--login .section-heading p {
            justify-self: center !important;
            color: var(--text) !important;
            line-height: 1.55 !important;
          }

          .client-cabinet-shell .client-login-actions {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            justify-self: center !important;
            justify-content: center !important;
            width: min(640px, 100%) !important;
            max-width: 100% !important;
            margin-top: 4px !important;
          }

          .client-cabinet-shell .client-login-actions .button {
            min-width: 0 !important;
            white-space: normal !important;
            text-align: center !important;
            line-height: 1.2 !important;
          }

          @media (max-width: 760px) {
            .client-cabinet-section--login {
              width: 100% !important;
              max-width: 100% !important;
              margin-top: 8px !important;
            }

            .client-cabinet-shell .client-login-actions {
              grid-template-columns: 1fr !important;
              justify-content: stretch !important;
              width: 100% !important;
            }

            .client-cabinet-shell .client-login-actions .button {
              width: 100% !important;
              min-width: 0 !important;
              white-space: normal !important;
              text-align: center !important;
            }
          }

          @media (max-width: 640px) {
            .language-switcher {
              width: min(calc(100% - 28px), 420px) !important;
              margin: 8px auto 0 !important;
              padding: 4px !important;
              justify-content: center !important;
            }

            .language-switcher__button {
              flex: 1 1 0 !important;
              min-width: 0 !important;
              padding-inline: 8px !important;
              white-space: nowrap !important;
            }

            .client-cabinet-shell {
              gap: 18px !important;
              padding: max(18px, env(safe-area-inset-top, 0px))
                max(16px, env(safe-area-inset-left, 0px))
                max(28px, calc(env(safe-area-inset-bottom, 0px) + 20px))
                max(16px, env(safe-area-inset-right, 0px)) !important;
            }

            .client-cabinet-section--login {
              border-radius: 24px !important;
              padding: 22px 18px !important;
            }
          }
        `}</style>
        <section className="content-section content-section--narrow client-cabinet-section client-cabinet-section--login">
          <div className="section-heading">
            <p className="eyebrow">Личный кабинет</p>
            <h1>Войдите в личный кабинет</h1>
            <p>
              Войдите по email или зарегистрируйтесь, чтобы увидеть купленные
              абонементы и повторить прошлую заявку.
            </p>
          </div>
          <TelegramMiniAppAutoLogin />
          <div className="form-actions client-cabinet-actions client-login-actions">
            <Link
              className="button button--primary"
              href="/client/login?next=%2Fclient"
            >
              Войти по email
            </Link>
            <Link className="button" href="/client/register">
              Зарегистрироваться
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
      where: { clientId: client.id, deletedAt: null },
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
        isSubscriptionSnapshot: true,
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
        subscriptionEndsAtSnapshot: true,
        subscriptionStartsAtSnapshot: true,
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
          <form action={clientLogoutAction}>
            <button className="button" type="submit">
              Выйти
            </button>
          </form>
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
              const paymentUrl = normalizeProdamusPaymentUrl(
                order.payment?.paymentUrl
              );
              const subscriptionValidity = getSubscriptionValidity(order);

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
