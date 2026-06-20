import Link from "next/link";
import { CreateServiceForm } from "@/components/service-form";
import { requireAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminNewProductPage() {
  await requireAdminUser("/admin/products");

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Новый продукт</p>
            <h2>Создать продукт</h2>
            <p className="admin-muted">
              Заполните базовые данные, цены и карточки обрядов. После создания
              админка сразу откроет карточку продукта.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/products">
              ← К списку
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <CreateServiceForm />
      </section>
    </div>
  );
}
