import { cookies } from "next/headers";
import { getAdminCopy } from "@/i18n/admin-copy";
import { localeCookieName } from "@/i18n/config";
import { requireSuperAdminUser } from "@/server/auth";
import {
  saveCuratorPaymentOptionSettings,
  savePaymentProviderSettings,
  savePostPaymentPageSettings
} from "@/server/payment-provider-actions";
import {
  getCuratorPaymentProviderSettings,
  getPaymentProviders,
  paymentProviderEnvNames
} from "@/server/payment-providers";
import { ensureSystemCurator } from "@/server/referrals";
import { prisma } from "@/lib/prisma";
import { getAdminOrigin } from "@/server/admin-curators";

export const dynamic = "force-dynamic";

async function getCuratorsWithPaymentSettings() {
  await ensureSystemCurator();

  const curators = await prisma.curator.findMany({
    orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      isSystem: true,
      name: true,
      postPurchaseText: true,
      postPurchaseTitle: true,
      postPurchaseUrl: true,
      supportButtonLabel: true,
      supportEnabled: true,
      supportUrl: true
    }
  });

  return Promise.all(
    curators.map(async (curator) => ({
      ...curator,
      providers: await getCuratorPaymentProviderSettings(curator.id)
    }))
  );
}

export default async function AdminPaymentsPage() {
  await requireSuperAdminUser("/admin/payments");

  const cookieStore = await cookies();
  const copy = getAdminCopy(cookieStore.get(localeCookieName)?.value);
  const [providers, curatorPaymentSettings, origin] = await Promise.all([
    getPaymentProviders(),
    getCuratorsWithPaymentSettings(),
    getAdminOrigin()
  ]);
  const successReturnUrl = origin
    ? `${origin}/payment/success?order=<publicToken>`
    : "/payment/success?order=<publicToken>";
  const failReturnUrl = origin
    ? `${origin}/payment/fail?order=<publicToken>`
    : "/payment/fail?order=<publicToken>";

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <h2>{copy.payments.title}</h2>
        <p className="admin-muted">{copy.payments.lead}</p>
        <p className="form-warning">{copy.payments.secretWarning}</p>
      </section>

      <section className="admin-card">
        <h2>{copy.payments.providers}</h2>
        <div className="admin-list">
          {providers.map((provider) => (
            <form
              action={savePaymentProviderSettings}
              className="admin-list-item"
              key={provider.code}
            >
              <input name="code" type="hidden" value={provider.code} />
              <label className="checkbox-field">
                <input
                  defaultChecked={provider.active}
                  name="active"
                  type="checkbox"
                />
                <span>
                  <strong>{provider.name}</strong>
                  <br />
                  {provider.description}
                </span>
              </label>
              <div>
                <p className="admin-muted">????? / ?????? ??? ????? ?????</p>
                <div className="checkbox-grid">
                  {[
                    ["ru", "RU / RUB"],
                    ["en", "EN / USD"],
                    ["hi", "HI / INR"]
                  ].map(([locale, label]) => (
                    <label className="checkbox-field" key={locale}>
                      <input
                        defaultChecked={provider.supportedLocales.includes(
                          locale as "ru" | "en" | "hi"
                        )}
                        name="supportedLocales"
                        type="checkbox"
                        value={locale}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="admin-muted">{copy.payments.envTitle}</p>
                {paymentProviderEnvNames[provider.code].length > 0 ? (
                  <ul className="admin-env-list">
                    {paymentProviderEnvNames[provider.code].map((name) => (
                      <li key={name}>
                        <code>{name}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-muted">
                    Реквизиты и инструкции задаются в кабинете куратора.
                  </p>
                )}
              </div>
              <button className="button button--primary" type="submit">
                {copy.payments.save}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Возврат клиента после оплаты</p>
            <h2>Страница после оплаты</h2>
            <p className="admin-muted">
              Эти тексты клиент видит на странице успешной оплаты после возврата
              из платежного шлюза. Для каждого заказа в шлюз передается
              персональная ссылка с токеном заказа.
            </p>
          </div>
        </div>

        <div className="admin-list-item">
          <p className="admin-muted">URL успешной оплаты:</p>
          <code>{successReturnUrl}</code>
          <p className="admin-muted">URL ошибки / отмены оплаты:</p>
          <code>{failReturnUrl}</code>
          <p className="form-note">
            Если клиент вернулся раньше webhook-подтверждения, страница покажет
            состояние «Проверяем оплату». Полный блок ниже появляется только
            когда платеж подтвержден.
          </p>
        </div>

        <div className="admin-list">
          {curatorPaymentSettings.map((curator) => {
            const title =
              curator.postPurchaseTitle?.trim() || "Оплата прошла успешно";
            const text =
              curator.postPurchaseText?.trim() ||
              "Спасибо за оплату. Администратор свяжется с клиентом и передаст дальнейшую информацию.";
            const supportLabel =
              curator.supportButtonLabel?.trim() || "Связаться с куратором";

            return (
              <article className="admin-list-item" key={curator.id}>
                <div className="admin-list-item__header">
                  <div>
                    <h3>{curator.name}</h3>
                    <p className="admin-muted">
                      {curator.isSystem
                        ? "Основной сайт"
                        : "Персональная ссылка куратора"}
                    </p>
                  </div>
                </div>

                <form
                  action={savePostPaymentPageSettings}
                  className="admin-form"
                >
                  <input name="curatorId" type="hidden" value={curator.id} />
                  <label className="field">
                    <span>Заголовок после оплаты</span>
                    <input
                      defaultValue={curator.postPurchaseTitle ?? ""}
                      name="postPurchaseTitle"
                      placeholder="Например: Оплата получена"
                      type="text"
                    />
                  </label>
                  <label className="field">
                    <span>Текст для клиента после оплаты</span>
                    <textarea
                      defaultValue={curator.postPurchaseText ?? ""}
                      name="postPurchaseText"
                      placeholder="Что клиент должен сделать дальше"
                      rows={4}
                    />
                  </label>
                  <label className="field">
                    <span>Ссылка после оплаты</span>
                    <input
                      defaultValue={curator.postPurchaseUrl ?? ""}
                      name="postPurchaseUrl"
                      placeholder="https://t.me/..."
                      type="url"
                    />
                  </label>
                  <div className="field-grid">
                    <label className="field">
                      <span>Текст кнопки поддержки</span>
                      <input
                        defaultValue={curator.supportButtonLabel ?? ""}
                        name="supportButtonLabel"
                        placeholder="Написать вопрос"
                        type="text"
                      />
                    </label>
                    <label className="field">
                      <span>Адрес поддержки</span>
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
                    <span>Показывать кнопку поддержки после оплаты</span>
                  </label>
                  <button className="button button--primary" type="submit">
                    Сохранить страницу после оплаты
                  </button>
                </form>

                <div className="post-purchase-box">
                  <p className="eyebrow">Предпросмотр для клиента</p>
                  <h2>{title}</h2>
                  <p>
                    Заказ #12345, куратор: <strong>{curator.name}</strong>
                  </p>
                  <p>{text}</p>
                  {curator.postPurchaseUrl ? (
                    <a
                      className="button"
                      href={curator.postPurchaseUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Открыть ссылку куратора
                    </a>
                  ) : (
                    <p className="form-note">
                      Ссылка после оплаты не задана — кнопка ссылки не появится.
                    </p>
                  )}
                  {curator.supportEnabled && curator.supportUrl ? (
                    <a
                      className="button button--primary"
                      href={curator.supportUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {supportLabel}
                    </a>
                  ) : (
                    <p className="form-note">
                      Кнопка поддержки сейчас скрыта или адрес поддержки не
                      задан.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Разрешения способов оплаты для кураторов</h2>
        <p className="admin-muted">
          SUPER_ADMIN выбирает, какие глобально включенные способы может
          использовать конкретный куратор. Куратор затем включает нужные способы
          и заполняет свои инструкции в кабинете.
        </p>
        <div className="admin-list">
          {curatorPaymentSettings.map((curator) => (
            <article className="admin-list-item" key={curator.id}>
              <div className="admin-list-item__header">
                <div>
                  <h3>{curator.name}</h3>
                  <p className="admin-muted">
                    {curator.isSystem
                      ? "Основной сайт /"
                      : "Персональная ссылка куратора"}
                  </p>
                </div>
              </div>
              <div className="payment-option-list">
                {curator.providers.map((provider) => (
                  <form
                    action={saveCuratorPaymentOptionSettings}
                    className="payment-option-row"
                    key={provider.code}
                  >
                    <input name="curatorId" type="hidden" value={curator.id} />
                    <input name="code" type="hidden" value={provider.code} />
                    <label className="checkbox-field">
                      <input
                        defaultChecked={provider.allowed}
                        disabled={!provider.active}
                        name="allowed"
                        type="checkbox"
                      />
                      <span>
                        <strong>{provider.name}</strong>
                        <br />
                        {!provider.active
                          ? "Глобально выключен"
                          : provider.enabled
                            ? "Разрешен и включен куратором"
                            : provider.allowed
                              ? "Разрешен, но выключен куратором"
                              : "Запрещен для куратора"}
                      </span>
                    </label>
                    <button
                      className="button"
                      disabled={!provider.active}
                      type="submit"
                    >
                      Сохранить
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
