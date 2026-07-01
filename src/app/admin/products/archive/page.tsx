import Link from "next/link";
import { getPriceUnitLabel } from "@/components/service-form";
import { requireAdminUser } from "@/server/auth";
import {
  permanentlyDeleteAllArchivedServices,
  permanentlyDeleteSelectedArchivedServices
} from "@/server/service-actions";
import { getManagedServices, type ManagedService } from "@/server/services";

export const dynamic = "force-dynamic";

function formatServicePrices(service: ManagedService) {
  return [
    `${service.priceRub.toLocaleString("ru-RU")} ₽`,
    service.priceUsd ? `${service.priceUsd.toLocaleString("en-US")} $` : "",
    service.priceInr ? `${service.priceInr.toLocaleString("hi-IN")} ₹` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatArchivedAt(value: Date | string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
    year: "numeric"
  }).format(date);
}

function ArchiveResultMessage({
  deleted,
  skipped
}: Readonly<{
  deleted?: string;
  skipped?: string;
}>) {
  if (deleted === undefined && skipped === undefined) {
    return null;
  }

  const deletedCount = Number(deleted ?? 0);
  const skippedCount = Number(skipped ?? 0);

  return (
    <section className="admin-card admin-card--wide admin-success">
      <strong>Удаление завершено</strong>
      <span>
        Удалено навсегда: {deletedCount}. Не удалено: {skippedCount}. Продукты
        с заказами остаются в архиве, чтобы не сломать историю заказов.
      </span>
    </section>
  );
}

export default async function AdminProductsArchivePage({
  searchParams
}: {
  searchParams: Promise<{
    deleted?: string;
    error?: string;
    skipped?: string;
  }>;
}) {
  await requireAdminUser("/admin/products/archive");

  const [params, services] = await Promise.all([
    searchParams,
    getManagedServices({ archived: true })
  ]);

  return (
    <div className="admin-grid">
      <ArchiveResultMessage deleted={params.deleted} skipped={params.skipped} />
      {params.error === "empty-selection" && (
        <section className="admin-card admin-card--wide admin-error">
          <strong>Ничего не выбрано</strong>
          <span>Отметьте один или несколько продуктов для удаления.</span>
        </section>
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Архив</p>
            <h2>Архив продуктов</h2>
            <p className="admin-muted">
              Здесь находятся продукты, удалённые из основного списка. Они скрыты
              с сайта. Можно выбрать продукты и удалить их навсегда или удалить
              весь архив одним действием.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/products">
              ← К продуктам
            </Link>
            {services.length > 0 && (
              <form action={permanentlyDeleteAllArchivedServices}>
                <button className="button button--danger" type="submit">
                  Удалить весь архив
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>В архиве: {services.length}</h2>
            <p className="admin-muted">
              Окончательное удаление доступно только для продуктов без заказов.
              Если у продукта есть заказы, он останется в архиве.
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <p className="admin-muted">Архив пуст.</p>
        ) : (
          <form action={permanentlyDeleteSelectedArchivedServices}>
            <div className="product-card-grid">
              {services.map((service) => {
                const activeOptionsCount = service.options.filter(
                  (option) => option.active
                ).length;

                return (
                  <article className="product-card" key={service.id}>
                    <div className="product-card__header">
                      <div>
                        <label className="checkbox-field">
                          <input
                            name="serviceId"
                            type="checkbox"
                            value={service.id}
                          />
                          <span className="product-card__title">
                            {service.title}
                          </span>
                        </label>
                        <p className="product-card__meta">
                          <code>/{service.slug}</code>
                          <span>{getPriceUnitLabel(service.priceUnit)}</span>
                        </p>
                      </div>
                      <span className="badge badge--muted">В архиве</span>
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
                          {service.isSubscription
                            ? "скрыты"
                            : `${activeOptionsCount} / ${service.options.length}`}
                        </dd>
                      </div>
                      <div>
                        <dt>Заказы</dt>
                        <dd>{service._count.orders}</dd>
                      </div>
                      <div>
                        <dt>В архиве с</dt>
                        <dd>{formatArchivedAt(service.archivedAt)}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>

            <div className="admin-card__actions">
              <button className="button button--danger" type="submit">
                Удалить выбранные навсегда
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
