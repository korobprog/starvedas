import Link from "next/link";
import { CreateServiceForm } from "@/components/service-form";
import { requireAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

function DuplicateSlugAlert({ slug }: Readonly<{ slug?: string }>) {
  return (
    <section className="admin-card admin-card--wide admin-error">
      <strong>Slug уже занят</strong>
      <span>
        {slug
          ? `Продукт с адресом /${slug} уже существует. Укажите другой slug.`
          : "Продукт с таким slug уже существует. Укажите другой slug."}
      </span>
    </section>
  );
}

export default async function AdminNewProductPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; slug?: string }>;
}) {
  await requireAdminUser("/admin/products");

  const query = await searchParams;

  return (
    <div className="admin-grid">
      {query.error === "duplicate-slug" && (
        <DuplicateSlugAlert slug={query.slug} />
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Новый продукт</p>
            <h2>Создать продукт</h2>
            <p className="admin-muted">
              Заполните базовые данные, цены и карточки обрядов при
              необходимости. Для абонемента укажите период действия.
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
