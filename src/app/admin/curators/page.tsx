import { headers } from "next/headers";
import { CreateCuratorForm } from "@/components/create-curator-form";
import { CuratorCopyTools } from "@/components/curator-copy-tools";
import { prisma } from "@/lib/prisma";
import {
  deactivateCuratorAction,
  updateCuratorAction
} from "@/server/curator-actions";
import {
  buildReferralPath,
  buildReferralUrl,
  ensureSystemCurator
} from "@/server/referrals";

export const dynamic = "force-dynamic";

async function getOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (host ? `${protocol}://${host}` : "")
  );
}

async function getCurators() {
  await ensureSystemCurator();

  return prisma.curator.findMany({
    orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      active: true,
      canEditPostPurchase: true,
      canEditSupport: true,
      canViewClients: true,
      hidden: true,
      id: true,
      isSystem: true,
      name: true,
      orders: {
        select: {
          amountRub: true,
          clientId: true,
          customerEmail: true,
          customerPhone: true,
          customerTelegram: true,
          id: true,
          status: true
        }
      },
      postPurchaseText: true,
      postPurchaseTitle: true,
      postPurchaseUrl: true,
      showMailingConsentCheckbox: true,
      referralLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          active: true,
          id: true,
          isPrimary: true,
          slug: true
        }
      },
      slug: true,
      supportButtonLabel: true,
      supportEnabled: true,
      supportUrl: true,
      user: {
        select: {
          active: true,
          email: true
        }
      }
    }
  });
}

function getClientCount(
  orders: Array<{
    clientId: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerTelegram: string | null;
    id: string;
  }>
) {
  return new Set(
    orders.map(
      (order) =>
        order.clientId ??
        order.customerEmail ??
        order.customerPhone ??
        order.customerTelegram ??
        order.id
    )
  ).size;
}

export default async function AdminCuratorsPage() {
  const [curators, origin] = await Promise.all([getCurators(), getOrigin()]);

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <h2>Создать куратора</h2>
        <p className="admin-muted">
          После создания система покажет логин, пароль и реферальную ссылку.
        </p>
        <CreateCuratorForm />
      </section>

      <section className="admin-card">
        <h2>Сводка</h2>
        <div className="stats-grid">
          <div>
            <strong>{curators.length}</strong>
            <span>профилей</span>
          </div>
          <div>
            <strong>
              {curators.reduce(
                (total, curator) => total + getClientCount(curator.orders),
                0
              )}
            </strong>
            <span>клиентов</span>
          </div>
          <div>
            <strong>
              {curators.reduce(
                (total, curator) => total + curator.orders.length,
                0
              )}
            </strong>
            <span>заказов</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Кураторы и реферальные ссылки</h2>
        <div className="admin-list">
          {curators.map((curator) => {
            const primaryReferralSlug =
              curator.referralLinks.find((link) => link.isPrimary)?.slug ??
              curator.slug;
            const referral = origin
              ? buildReferralUrl(origin, primaryReferralSlug)
              : buildReferralPath(primaryReferralSlug);
            const oldReferralLinks = curator.referralLinks.filter(
              (link) => !link.isPrimary
            );
            const clientCount = getClientCount(curator.orders);
            const paidAmount = curator.orders
              .filter((order) => order.status === "PAID")
              .reduce((total, order) => total + order.amountRub, 0);

            return (
              <article className="admin-list-item" key={curator.id}>
                <div className="admin-list-item__header">
                  <div>
                    <h3>{curator.name}</h3>
                    <p className="admin-muted">
                      {curator.isSystem
                        ? "Системный профиль для клиентов без реферальной ссылки"
                        : !curator.active
                          ? "Отключен"
                          : curator.hidden
                            ? "Скрыт"
                            : "Активен"}
                    </p>
                  </div>
                  <span className="badge">{clientCount} клиентов</span>
                </div>

                <dl className="details-list">
                  <div>
                    <dt>Реферальная ссылка</dt>
                    <dd>
                      <a href={referral} rel="noreferrer" target="_blank">
                        {referral}
                      </a>
                    </dd>
                  </div>
                  {oldReferralLinks.length > 0 && (
                    <div>
                      <dt>Старые ссылки</dt>
                      <dd>
                        {oldReferralLinks.map((link) => {
                          const oldReferral = origin
                            ? buildReferralUrl(origin, link.slug)
                            : buildReferralPath(link.slug);

                          return (
                            <a
                              href={oldReferral}
                              key={link.id}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {oldReferral}
                              {!link.active ? " (отключена)" : ""}
                            </a>
                          );
                        })}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Заказы</dt>
                    <dd>{curator.orders.length}</dd>
                  </div>
                  <div>
                    <dt>Оплачено</dt>
                    <dd>{paidAmount.toLocaleString("ru-RU")} руб.</dd>
                  </div>
                </dl>

                <form action={updateCuratorAction} className="admin-form">
                  <input name="id" type="hidden" value={curator.id} />
                  <div className="field-grid">
                    <label className="field">
                      <span>Имя</span>
                      <input
                        defaultValue={curator.name}
                        name="name"
                        required
                        type="text"
                      />
                    </label>
                    <label className="field">
                      <span>Slug</span>
                      <input
                        defaultValue={primaryReferralSlug}
                        disabled={curator.isSystem}
                        name="slug"
                        required
                        type="text"
                      />
                    </label>
                    {curator.isSystem && (
                      <input
                        name="slug"
                        type="hidden"
                        value={primaryReferralSlug}
                      />
                    )}
                  </div>
                  <div className="field-grid">
                    <label className="field">
                      <span>Email</span>
                      <input
                        defaultValue={curator.user?.email ?? ""}
                        name="email"
                        type="email"
                      />
                    </label>
                    <label className="field">
                      <span>Новый пароль</span>
                      <input
                        name="password"
                        placeholder="Заполните только для смены"
                        type="text"
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Заголовок после покупки</span>
                    <input
                      defaultValue={curator.postPurchaseTitle ?? ""}
                      name="postPurchaseTitle"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>Текст для клиента после покупки</span>
                    <textarea
                      defaultValue={curator.postPurchaseText ?? ""}
                      name="postPurchaseText"
                      rows={4}
                    />
                  </label>
                  <label className="field">
                    <span>Ссылка для клиента после покупки</span>
                    <input
                      defaultValue={curator.postPurchaseUrl ?? ""}
                      name="postPurchaseUrl"
                      placeholder="https://t.me/..."
                      type="url"
                    />
                  </label>
                  <div className="field-grid">
                    <label className="field">
                      <span>Кнопка вопроса клиенту</span>
                      <input
                        defaultValue={curator.supportButtonLabel ?? ""}
                        name="supportButtonLabel"
                        placeholder="Написать вопрос куратору"
                        type="text"
                      />
                    </label>
                    <label className="field">
                      <span>Адрес для вопросов</span>
                      <input
                        defaultValue={curator.supportUrl ?? ""}
                        name="supportUrl"
                        placeholder="https://t.me/..., @username, email или телефон"
                        type="text"
                      />
                    </label>
                  </div>
                  <label className="checkbox-field">
                    <input
                      defaultChecked={curator.supportEnabled}
                      name="supportEnabled"
                      type="checkbox"
                    />
                    <span>Показывать кнопку вопросов клиентам</span>
                  </label>
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
                  <label className="checkbox-field">
                    <input
                      defaultChecked={curator.active}
                      disabled={curator.isSystem}
                      name="active"
                      type="checkbox"
                    />
                    <span>Активен</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      defaultChecked={curator.hidden}
                      disabled={curator.isSystem}
                      name="hidden"
                      type="checkbox"
                    />
                    <span>Скрыть персональную версию сайта</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      defaultChecked={curator.canEditPostPurchase}
                      disabled={curator.isSystem}
                      name="canEditPostPurchase"
                      type="checkbox"
                    />
                    <span>Может менять информацию после покупки</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      defaultChecked={curator.canEditSupport}
                      disabled={curator.isSystem}
                      name="canEditSupport"
                      type="checkbox"
                    />
                    <span>Может менять кнопку поддержки</span>
                  </label>
                  <label className="checkbox-field">
                    <input
                      defaultChecked={curator.canViewClients}
                      disabled={curator.isSystem}
                      name="canViewClients"
                      type="checkbox"
                    />
                    <span>Может видеть клиентов и покупки</span>
                  </label>
                  {!curator.isSystem && (
                    <CuratorCopyTools
                      fallbackEmail={curator.user?.email ?? ""}
                      fallbackName={curator.name}
                      fallbackReferral={referral}
                      origin={origin}
                    />
                  )}
                  <button className="button button--primary" type="submit">
                    Сохранить
                  </button>
                </form>

                {!curator.isSystem && curator.active && (
                  <form action={deactivateCuratorAction}>
                    <input name="id" type="hidden" value={curator.id} />
                    <button className="button" type="submit">
                      Удалить куратора
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
