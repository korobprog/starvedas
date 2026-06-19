import {
  CreateServiceForm,
  ServiceEditorList
} from "@/components/service-form";
import { requireAdminUser } from "@/server/auth";
import { getManagedServices } from "@/server/services";

export const dynamic = "force-dynamic";

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

  return (
    <div className="admin-grid">
      {params.saved && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Сохранено</strong>
          <span>Изменения продукта и карточек обрядов успешно сохранены.</span>
        </section>
      )}

      <section className="admin-card">
        <h2>Создать продукт</h2>
        <p className="admin-muted">
          Продукты и абонементы показываются на сайте и используются в заказах.
          Slug должен быть уникальным и состоять из латинских букв, цифр и
          дефисов.
        </p>
        <CreateServiceForm />
      </section>

      <section className="admin-card">
        <h2>Сводка</h2>
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
            <strong>{ordersCount}</strong>
            <span>заказов</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Продукты и абонементы</h2>
        <ServiceEditorList services={services} />
      </section>
    </div>
  );
}
