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
          <div className="product-card-grid">
            {services.map((service) => {
              const activeOptionsCount = service.options.filter(
                (option) => option.active
              ).length;
              const detailHref = `/admin/products/${service.id}`;

              return (
                <article className="product-card" key={service.id}>
                  <div className="product-card__header">
                    <div>
                      <Link className="product-card__title" href={detailHref}>
                        {service.title}
                      </Link>
                      <p className="product-card__meta">
                        <code>/{service.slug}</code>
                        <span>{getPriceUnitLabel(service.priceUnit)}</span>
                      </p>
                    </div>
                    <span className={getServiceStatusClassName(service)}>
                      {getServiceStatusLabel(service)}
                    </span>
                  </div>

                  <p className="product-card__description">
                    {service.receiptName ||
                      service.description ||
                      "Описание продукта не заполнено"}
                  </p>

                  <dl className="product-card__stats">
                    <div>
                      <dt>Цена</dt>
                      <dd>{formatServicePrices(service)}</dd>
                    </div>
                    <div>
                      <dt>Карточки</dt>
                      <dd>
                        {activeOptionsCount} / {service.options.length}
                      </dd>
                    </div>
                    <div>
                      <dt>Заказы</dt>
                      <dd>{service._count.orders}</dd>
                    </div>
                    <div>
                      <dt>Сортировка</dt>
                      <dd>{service.sortOrder}</dd>
                    </div>
                  </dl>

                  {service.options.length > 0 && (
                    <div className="product-card__options">
                      {service.options.slice(0, 3).map((option) => (
                        <span key={option.id}>
                          {option.title}
                          {!option.active ? " · скрыта" : ""}
                        </span>
                      ))}
                      {service.options.length > 3 && (
                        <span>+{service.options.length - 3} ещё</span>
                      )}
                    </div>
                  )}

                  <div className="product-card__actions">
                    <Link className="button button--small" href={detailHref}>
                      Открыть карточку
                    </Link>
                    <Link
                      aria-label={`Открыть карточку ???????? ${service.title}`}
                      className="icon-button icon-button--menu"
                      href={detailHref}
                      title="Открыть карточку"
                    >
                      …
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
