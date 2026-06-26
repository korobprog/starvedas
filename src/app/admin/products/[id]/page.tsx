import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPriceUnitLabel,
  ToggleServiceActiveForm,
  UpdateServiceForm
} from "@/components/service-form";
import { requireAdminUser } from "@/server/auth";
import { getManagedService } from "@/server/services";

export const dynamic = "force-dynamic";

function formatServicePrices(
  service: NonNullable<Awaited<ReturnType<typeof getManagedService>>>
) {
  return [
    `${service.priceRub.toLocaleString("ru-RU")} ₽`,
    service.priceUsd ? `${service.priceUsd.toLocaleString("en-US")} $` : "",
    service.priceInr ? `${service.priceInr.toLocaleString("hi-IN")} ₹` : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

export default async function AdminProductDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  await requireAdminUser("/admin/products");

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const service = await getManagedService(id);

  if (!service) {
    notFound();
  }

  const activeOptionsCount = service.options.filter(
    (option) => option.active
  ).length;

  return (
    <div className="admin-grid">
      {(query.created || query.saved) && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>{query.created ? "Продукт создан" : "Сохранено"}</strong>
          <span>
            {query.created
              ? "Теперь можно проверить настройки и дополнить карточки обрядов."
              : "Изменения продукта и карточек обрядов успешно сохранены."}
          </span>
        </section>
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Карточка продукта</p>
            <h2>{service.title}</h2>
            <p className="admin-muted">
              /{service.slug} · {formatServicePrices(service)} ·{" "}
              {getPriceUnitLabel(service.priceUnit)}
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/products">
              ← К списку
            </Link>
            <Link className="button button--primary" href="/admin/products/new">
              Создать еще
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="curator-detail-summary">
          <div>
            <span>Статус</span>
            <strong
              className={
                service.active ? "badge badge--success" : "badge badge--muted"
              }
            >
              {service.active ? "Активен" : "Скрыт"}
            </strong>
          </div>
          <div>
            <span>Карточки обрядов</span>
            <strong>
              {service.isSubscription
                ? "скрыты для абонемента"
                : `${activeOptionsCount} / ${service.options.length}`}
            </strong>
          </div>
          <div>
            <span>Заказы</span>
            <strong>{service._count.orders}</strong>
          </div>
          <div>
            <span>Сортировка</span>
            <strong>{service.sortOrder}</strong>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <UpdateServiceForm service={service} />
        <ToggleServiceActiveForm service={service} />
      </section>
    </div>
  );
}
