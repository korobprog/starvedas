import { CuratorUpdateForm } from "@/components/curator-update-form";
import { deactivateCuratorAction } from "@/server/curator-actions";
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

      <CuratorUpdateForm
        active={curator.active}
        canEditPostPurchase={curator.canEditPostPurchase}
        canEditSupport={curator.canEditSupport}
        canViewClients={curator.canViewClients}
        email={curator.user?.email ?? ""}
        fallbackReferral={referral}
        hidden={curator.hidden}
        id={curator.id}
        isSystem={curator.isSystem}
        name={curator.name}
        origin={origin}
        postPurchaseText={curator.postPurchaseText ?? ""}
        postPurchaseTitle={curator.postPurchaseTitle ?? ""}
        postPurchaseUrl={curator.postPurchaseUrl ?? ""}
        primaryReferralSlug={primaryReferralSlug}
        showMailingConsentCheckbox={curator.showMailingConsentCheckbox}
        supportButtonLabel={curator.supportButtonLabel ?? ""}
        supportEnabled={curator.supportEnabled}
        supportUrl={curator.supportUrl ?? ""}
        telegramId={curator.telegramId ?? ""}
      />

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
