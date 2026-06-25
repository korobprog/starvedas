import { cookies } from "next/headers";
import { getAdminCopy } from "@/i18n/admin-copy";
import { localeCookieName } from "@/i18n/config";
import { requireSuperAdminUser } from "@/server/auth";
import {
  getPublicOrganizationSettings,
  sellerTypeOptions
} from "@/server/organization-settings";
import {
  saveOrganizationSettings,
  saveOfferMarkdown,
  setCuratorServicePermission
} from "@/server/organization-actions";
import { savePartnerProgramAgreementText } from "@/server/partner-applications";
import { getEditableOfferDocument } from "@/server/legal-documents";

export const dynamic = "force-dynamic";

export default async function AdminOrganizationPage() {
  await requireSuperAdminUser("/admin/organization");

  const cookieStore = await cookies();
  const copy = getAdminCopy(cookieStore.get(localeCookieName)?.value);
  const { contact, settings } = await getPublicOrganizationSettings();
  const offerDocument = await getEditableOfferDocument();

  return (
    <div className="admin-grid">
      <section className="admin-card">
        <h2>{copy.organization.publicData}</h2>
        <p className="admin-muted">{copy.organization.publicLead}</p>
        <dl className="details-list">
          <div>
            <dt>{copy.organization.labels.operator}</dt>
            <dd>{contact.seller}</dd>
          </div>
          <div>
            <dt>{copy.organization.labels.inn}</dt>
            <dd>{contact.inn}</dd>
          </div>
          <div>
            <dt>{copy.organization.labels.ogrn}</dt>
            <dd>{contact.ogrnip}</dd>
          </div>
          <div>
            <dt>{copy.organization.labels.email}</dt>
            <dd>{contact.email}</dd>
          </div>
          <div>
            <dt>{copy.organization.labels.phone}</dt>
            <dd>{contact.phone}</dd>
          </div>
          <div>
            <dt>{copy.organization.labels.telegram}</dt>
            <dd>{contact.telegram}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-card">
        <h2>{copy.organization.settings}</h2>
        <form action={saveOrganizationSettings} className="admin-form">
          <label className="field">
            <span>{copy.organization.sellerType}</span>
            <select
              defaultValue={settings?.sellerType ?? "IP"}
              name="sellerType"
              required
            >
              {sellerTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {copy.organization.sellerTypes[option.value]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{copy.organization.legalName}</span>
            <input
              defaultValue={settings?.legalName ?? contact.seller}
              name="legalName"
              placeholder="ИП Иванов Иван Иванович"
              type="text"
            />
          </label>

          <label className="field">
            <span>{copy.organization.directorName}</span>
            <input
              defaultValue={settings?.directorName ?? ""}
              name="directorName"
              type="text"
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>{copy.organization.labels.inn}</span>
              <input
                defaultValue={settings?.inn ?? contact.inn}
                name="inn"
                type="text"
              />
            </label>
            <label className="field">
              <span>{copy.organization.labels.ogrn}</span>
              <input
                defaultValue={settings?.ogrn ?? contact.ogrnip}
                name="ogrn"
                type="text"
              />
            </label>
          </div>

          <label className="field">
            <span>{copy.organization.legalAddress}</span>
            <textarea
              defaultValue={settings?.legalAddress ?? contact.address}
              name="legalAddress"
              rows={3}
            />
          </label>

          <label className="field">
            <span>{copy.organization.postalAddress}</span>
            <textarea
              defaultValue={settings?.postalAddress ?? ""}
              name="postalAddress"
              rows={3}
            />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>{copy.organization.clientEmail}</span>
              <input
                defaultValue={settings?.clientEmail ?? contact.email}
                name="clientEmail"
                type="email"
              />
            </label>
            <label className="field">
              <span>{copy.organization.clientPhone}</span>
              <input
                defaultValue={settings?.clientPhone ?? contact.phone}
                name="clientPhone"
                type="text"
              />
            </label>
          </div>

          <label className="field">
            <span>{copy.organization.officialTelegram}</span>
            <input
              defaultValue={settings?.officialTelegram ?? contact.telegram}
              name="officialTelegram"
              type="text"
            />
          </label>

          <label className="field">
            <span>{copy.organization.supportHours}</span>
            <input
              defaultValue={settings?.supportHours ?? contact.supportHours}
              name="supportHours"
              type="text"
            />
          </label>

          <label className="checkbox-field">
            <input
              defaultChecked={
                settings?.hideChintamaniAdminSupportButtons ?? false
              }
              name="hideChintamaniAdminSupportButtons"
              type="checkbox"
            />
            <span>
              Скрыть все кнопки “Написать вопрос администратору” на
              chintamanidhama.ru. На starvedas.ru кнопки останутся без
              изменений.
            </span>
          </label>

          <label className="field">
            <span>{copy.organization.bankDetails}</span>
            <textarea
              defaultValue={settings?.bankDetails ?? ""}
              name="bankDetails"
              rows={4}
            />
          </label>

          <label className="field">
            <span>{copy.organization.recipientName}</span>
            <input
              defaultValue={settings?.publicRecipientName ?? ""}
              name="publicRecipientName"
              type="text"
            />
          </label>

          <label className="field">
            <span>{copy.organization.cashboxDetails}</span>
            <textarea
              defaultValue={settings?.cashboxDetails ?? ""}
              name="cashboxDetails"
              rows={3}
            />
          </label>

          <button className="button button--primary" type="submit">
            {copy.organization.save}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Оферта в Markdown</h2>
        <p className="admin-muted">
          Вставьте сюда текст публичной оферты в формате Markdown. Публичная
          ссылка для клиентов: <a href="/legal/offer">/legal/offer</a>. Доступны
          плейсхолдеры: {"{{seller}}"}, {"{{inn}}"}, {"{{ogrnip}}"},{" "}
          {"{{address}}"}, {"{{email}}"}, {"{{phone}}"}, {"{{telegram}}"}.
        </p>
        <form action={saveOfferMarkdown} className="admin-form">
          <label className="field">
            <span>Markdown-текст оферты</span>
            <textarea
              defaultValue={offerDocument?.content ?? ""}
              name="offerMarkdown"
              placeholder="# Публичная оферта&#10;&#10;## 1. Общие положения&#10;&#10;Текст оферты..."
              rows={18}
            />
          </label>
          <button className="button button--primary" type="submit">
            Сохранить оферту
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Правила партнёрской программы</h2>
        <form action={savePartnerProgramAgreementText} className="admin-form">
          <label className="field">
            <span>Текст принятия правил партнёрской программы</span>
            <textarea
              defaultValue={settings?.partnerProgramAgreementText ?? ""}
              name="partnerProgramAgreementText"
              placeholder="Вставьте текст правил, который куратор должен принять перед отправкой заявки на партнёрские ссылки."
              rows={10}
            />
          </label>
          <p className="admin-muted">
            Этот текст показывается кураторам в кабинете перед отправкой данных
            ИП или самозанятого на модерацию.
          </p>
          <button className="button button--primary" type="submit">
            Сохранить правила
          </button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Права агентов</h2>
        <form action={setCuratorServicePermission} className="admin-form">
          <label className="checkbox-field">
            <input
              defaultChecked={settings?.allowCuratorManageServices ?? false}
              name="allowCuratorManageServices"
              type="checkbox"
            />
            <span>
              Разрешить агентам создавать и редактировать продукты/абонементы в
              их кабинетах
            </span>
          </label>
          <p className="admin-muted">
            По умолчанию продуктами управляет только администратор. Отключение
            тумблера сразу убирает доступ у агентов.
          </p>
          <button className="button button--primary" type="submit">
            Сохранить
          </button>
        </form>
      </section>
    </div>
  );
}
