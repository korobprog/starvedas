import { cookies } from "next/headers";
import { getAdminCopy } from "@/i18n/admin-copy";
import { localeCookieName } from "@/i18n/config";
import { requireSuperAdminUser } from "@/server/auth";
import {
  saveCuratorPaymentOptionSettings,
  savePaymentProviderSettings
} from "@/server/payment-provider-actions";
import {
  getCuratorPaymentProviderSettings,
  getPaymentProviders,
  paymentProviderEnvNames
} from "@/server/payment-providers";
import { ensureSystemCurator } from "@/server/referrals";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getCuratorsWithPaymentSettings() {
  await ensureSystemCurator();

  const curators = await prisma.curator.findMany({
    orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      isSystem: true,
      name: true
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
  const [providers, curatorPaymentSettings] = await Promise.all([
    getPaymentProviders(),
    getCuratorsWithPaymentSettings()
  ]);

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
