import Link from "next/link";
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

export default async function AdminCuratorsPage() {
  const [curators, origin] = await Promise.all([
    getAdminCurators(),
    getAdminOrigin()
  ]);
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

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Список кураторов</h2>
            <p className="admin-muted">
              В таблице оставлены только данные для быстрого выбора. Все
              редактирование находится внутри карточки куратора.
            </p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="admin-table curators-table">
            <thead>
              <tr>
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

                return (
                  <tr key={curator.id}>
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
                        <span>{curator.user?.email ?? "Email не указан"}</span>
                        {curator.telegramId && (
                          <span>Telegram ID: {curator.telegramId}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <a href={referral} rel="noreferrer" target="_blank">
                        {referral}
                      </a>
                    </td>
                    <td>
                      {clientCount} / {curator.orders.length}
                    </td>
                    <td>{paidAmount.toLocaleString("ru-RU")} руб.</td>
                    <td>
                      <Link
                        className="button"
                        href={`/admin/curators/${curator.id}`}
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
