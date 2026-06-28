import Link from "next/link";
import {
  CuratorBulkDeleteForm,
  CuratorBulkDeleteSubmitButton
} from "@/components/curator-bulk-delete-form";
import { PartnerApplicationsAdminPanel } from "@/components/partner-applications-admin-panel";
import { ReferralLinkTools } from "@/components/referral-link-tools";
import { prisma } from "@/lib/prisma";
import {
  getAdminCurators,
  getAdminOrigin,
  getClientCount,
  getCuratorStatusClassName,
  getCuratorStatusLabel,
  getPaidAmount,
  getReferralForCurator
} from "@/server/admin-curators";

export const dynamic = "force-dynamic";

function getReferralDisplayValue(referral: string) {
  try {
    const url = new URL(referral);

    return decodeURI(`${url.host}${url.pathname}`);
  } catch {
    return decodeURI(referral.replace(/^https?:\/\//, ""));
  }
}

export default async function AdminCuratorsPage() {
  const [curators, origin] = await Promise.all([
    getAdminCurators(),
    getAdminOrigin()
  ]);
  const partnerApplications = await prisma.curatorPartnerApplication.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      adminComment: true,
      bankDetails: true,
      comment: true,
      createdAt: true,
      curator: {
        select: {
          name: true,
          user: {
            select: {
              email: true
            }
          }
        }
      },
      email: true,
      fullName: true,
      id: true,
      inn: true,
      ogrnip: true,
      phone: true,
      registrationAddress: true,
      status: true,
      type: true
    }
  });
  const totalClients = curators.reduce(
    (total, curator) => total + getClientCount(curator.orders),
    0
  );
  const totalOrders = curators.reduce(
    (total, curator) => total + curator.orders.length,
    0
  );
  const activeCurators = curators.filter((curator) => curator.active).length;

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Команда</p>
            <h2>Кураторы</h2>
            <p className="admin-muted">
              Компактный список вместо больших карточек. Откройте куратора,
              чтобы посмотреть ссылку, доступы, настройки после покупки и права.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button button--primary" href="/admin/curators/new">
              Создать куратора
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="stats-grid">
          <div>
            <strong>{curators.length}</strong>
            <span>профилей</span>
          </div>
          <div>
            <strong>{activeCurators}</strong>
            <span>активных</span>
          </div>
          <div>
            <strong>{totalClients}</strong>
            <span>клиентов</span>
          </div>
          <div>
            <strong>{totalOrders}</strong>
            <span>заказов</span>
          </div>
        </div>
      </section>

      <PartnerApplicationsAdminPanel applications={partnerApplications} />

      <section className="admin-card admin-card--wide">
        <CuratorBulkDeleteForm>
          <div className="admin-card__header">
            <div>
              <h2>Список кураторов</h2>
              <p className="admin-muted">
                В таблице оставлены только данные для быстрого выбора. Все
                редактирование находится внутри карточки куратора.
              </p>
              <p className="admin-muted">
                Отметьте кураторов галочками и удалите полностью, вместе с их
                заявками, оплатами, ссылками и учетными записями.
              </p>
            </div>
            <div className="admin-card__actions">
              <CuratorBulkDeleteSubmitButton
                className="button button--danger"
                pendingLabel="Удаляем…"
              >
                Удалить выбранных полностью
              </CuratorBulkDeleteSubmitButton>
            </div>
          </div>

          <div className="table-wrap">
            <table className="admin-table curators-table">
              <thead>
                <tr>
                  <th aria-label="Выбор" />
                  <th>Куратор</th>
                  <th>Контакты</th>
                  <th>Реферальная ссылка</th>
                  <th>Клиенты / заказы</th>
                  <th>Оплачено</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {curators.map((curator) => {
                  const clientCount = getClientCount(curator.orders);
                  const paidAmount = getPaidAmount(curator);
                  const referral = getReferralForCurator(curator, origin);
                  const referralDisplayValue =
                    getReferralDisplayValue(referral);

                  return (
                    <tr key={curator.id}>
                      <td className="curators-table__select">
                        <input
                          aria-label={`Выбрать куратора ${curator.name}`}
                          data-curator-name={curator.name}
                          disabled={curator.isSystem}
                          name="ids"
                          type="checkbox"
                          value={curator.id}
                        />
                      </td>
                      <td>
                        <div className="curators-table__name">
                          <Link href={`/admin/curators/${curator.id}`}>
                            {curator.name}
                          </Link>
                          <span className={getCuratorStatusClassName(curator)}>
                            {getCuratorStatusLabel(curator)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="curators-table__stack">
                          <span>
                            {curator.user?.email ?? "Email не указан"}
                          </span>
                          {curator.telegramId && (
                            <span>Telegram ID: {curator.telegramId}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <ReferralLinkTools
                          displayValue={referralDisplayValue}
                          href={referral}
                        />
                      </td>
                      <td className="curators-table__metric">
                        {clientCount} / {curator.orders.length}
                      </td>
                      <td className="curators-table__metric">
                        {paidAmount.toLocaleString("ru-RU")} руб.
                      </td>
                      <td className="curators-table__actions">
                        <Link
                          aria-label={`Открыть карточку куратора ${curator.name}`}
                          className="icon-button icon-button--menu"
                          href={`/admin/curators/${curator.id}`}
                          title="Открыть карточку"
                        >
                          …
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CuratorBulkDeleteForm>
      </section>
    </div>
  );
}
