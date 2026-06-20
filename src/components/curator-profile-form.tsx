import { CuratorCopyTools } from "@/components/curator-copy-tools";
import {
  deactivateCuratorAction,
  updateCuratorAction
} from "@/server/curator-actions";
import {
  type AdminCurator,
  getClientCount,
  getCuratorStatusClassName,
  getCuratorStatusLabel,
  getOldReferralLinks,
  getPaidAmount,
  getPrimaryReferralSlug,
  getReferralForCurator
} from "@/server/admin-curators";
import { buildReferralPath, buildReferralUrl } from "@/server/referrals";

type CuratorProfileFormProps = {
  curator: AdminCurator;
  origin: string;
};

export function CuratorProfileForm({
  curator,
  origin
}: CuratorProfileFormProps) {
  const primaryReferralSlug = getPrimaryReferralSlug(curator);
  const referral = getReferralForCurator(curator, origin);
  const oldReferralLinks = getOldReferralLinks(curator);
  const clientCount = getClientCount(curator.orders);
  const paidAmount = getPaidAmount(curator);

  return (
    <div className="curator-detail-card">
      <div className="curator-detail-summary">
        <div>
          <span>Статус</span>
          <strong className={getCuratorStatusClassName(curator)}>
            {getCuratorStatusLabel(curator)}
          </strong>
        </div>
        <div>
          <span>Клиенты</span>
          <strong>{clientCount}</strong>
        </div>
        <div>
          <span>Заказы</span>
          <strong>{curator.orders.length}</strong>
        </div>
        <div>
          <span>Оплачено</span>
          <strong>{paidAmount.toLocaleString("ru-RU")} руб.</strong>
        </div>
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
      </dl>

      <form action={updateCuratorAction} className="admin-form">
        <input name="id" type="hidden" value={curator.id} />
        <div className="field-grid">
          <label className="field">
            <span>Имя</span>
            <input defaultValue={curator.name} name="name" required type="text" />
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
            <input name="slug" type="hidden" value={primaryReferralSlug} />
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
            <span>Telegram ID куратора</span>
            <input
              defaultValue={curator.telegramId ?? ""}
              inputMode="numeric"
              name="telegramId"
              placeholder="123456789"
              type="text"
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

        <div className="checkbox-grid">
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
            <span>Показывать чекбокс согласия на рассылку в форме заявки</span>
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
        </div>

        {!curator.isSystem && (
          <CuratorCopyTools
            fallbackEmail={curator.user?.email ?? ""}
            fallbackName={curator.name}
            fallbackReferral={referral}
            origin={origin}
          />
        )}

        <div className="form-actions form-actions--static">
          <button className="button button--primary" type="submit">
            Сохранить
          </button>
        </div>
      </form>

      {!curator.isSystem && curator.active && (
        <form action={deactivateCuratorAction}>
          <input name="id" type="hidden" value={curator.id} />
          <button className="button" type="submit">
            Удалить куратора
          </button>
        </form>
      )}
    </div>
  );
}
