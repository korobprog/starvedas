import Link from "next/link";
import { getPriceUnitLabel } from "@/components/service-form";
import { requireAdminUser } from "@/server/auth";
import { getManagedServices, type ManagedService } from "@/server/services";

export const dynamic = "force-dynamic";

function getServiceStatusLabel(service: ManagedService) {
  return service.active ? "Активен" : "Скрыт";
}

function getServiceStatusClassName(service: ManagedService) {
  return service.active ? "badge badge--success" : "badge badge--muted";
}

function formatServicePrices(service: ManagedService) {
  return [
    `${service.priceRub.toLocaleString("ru-RU")} ₽`,
    service.priceUsd ? `${service.priceUsd.toLocaleString("en-US")} $` : "",
    service.priceInr ? `${service.priceInr.toLocaleString("hi-IN")} ₹` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminUser("/admin/products");

  const params = await searchParams;
  const services = await getManagedServices();
  const activeCount = services.filter((service) => service.active).length;
  const ordersCount = services.reduce(
    (total, service) => total + service._count.orders,
    0
  );
  const optionsCount = services.reduce(
    (total, service) => total + service.options.length,
    0
  );

  return (
    <div className="admin-grid">
      {params.saved && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Сохранено</strong>
          <span>Изменения продукта и карточек обрядов успешно сохранены.</span>
        </section>
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Каталог</p>
            <h2>Продукты</h2>
            <p className="admin-muted">
              Компактный список для быстрого выбора. Все настройки продукта,
              цены, переводы и карточки обрядов теперь находятся внутри
              отдельной карточки.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button button--primary" href="/admin/products/new">
              Создать продукт
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="stats-grid">
          <div>
            <strong>{services.length}</strong>
            <span>всего</span>
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>активных</span>
          </div>
          <div>
            <strong>{optionsCount}</strong>
            <span>карточек обрядов</span>
          </div>
          <div>
            <strong>{ordersCount}</strong>
            <span>заказов</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Список продуктов</h2>
            <p className="admin-muted">
              Нажмите на название или на кнопку «…», чтобы открыть полную
              карточку редактирования.
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <p className="admin-muted">Продукты пока не созданы.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table products-table">
              <thead>
                <tr>
                  <th>Продукт</th>
                  <th>Slug</th>
                  <th>Цена</th>
                  <th>Карточки</th>
                  <th>Заказы</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {services.map((service) => {
                  const activeOptionsCount = service.options.filter(
                    (option) => option.active
                  ).length;

                  return (
                    <tr key={service.id}>
                      <td>
                        <div className="curators-table__name">
                          <Link href={`/admin/products/${service.id}`}>
                            {service.title}
                          </Link>
                          <span className={getServiceStatusClassName(service)}>
                            {getServiceStatusLabel(service)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <code className="table-code">/{service.slug}</code>
                      </td>
                      <td>
                        <div className="curators-table__stack">
                          <strong>{formatServicePrices(service)}</strong>
                          <span>{getPriceUnitLabel(service.priceUnit)}</span>
                        </div>
                      </td>
                      <td className="curators-table__metric">
                        {activeOptionsCount} / {service.options.length}
                      </td>
                      <td className="curators-table__metric">
                        {service._count.orders}
                      </td>
                      <td className="curators-table__actions">
                        <Link
                          aria-label={`Открыть карточку продукта ${service.title}`}
                          className="icon-button icon-button--menu"
                          href={`/admin/products/${service.id}`}
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
        )}
      </section>
    </div>
  );
}
