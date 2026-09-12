import Link from "next/link";
import { FormPristineHint } from "@/components/form-pristine-hint";
import { CreateServiceForm } from "@/components/service-form";
import {
  getServiceModuleTitle,
  serviceModuleKeys,
  type ServiceModuleKey
} from "@/lib/service-modules";
import { requireAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

function DuplicateSlugAlert({ slug }: Readonly<{ slug?: string }>) {
  return (
    <section className="admin-card admin-card--wide admin-error">
      <strong>Slug уже занят</strong>
      <span>
        {slug
          ? `Продукт с адресом /${slug} уже существует. Измените название — slug сформируется автоматически.`
          : "Продукт с таким slug уже существует. Измените название — slug сформируется автоматически."}
      </span>
    </section>
  );
}

/**
 * Модуль приходит из адреса, поэтому берём только известный ключ: иначе в поле
 * подставится что угодно из строки браузера.
 */
function parseModuleKey(value: string | undefined): ServiceModuleKey | null {
  return serviceModuleKeys.find((key) => key === value) ?? null;
}

export default async function AdminNewProductPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; module?: string; slug?: string }>;
}) {
  await requireAdminUser("/admin/products");

  const query = await searchParams;
  const moduleKey = parseModuleKey(query.module);
  const moduleTitle = getServiceModuleTitle(moduleKey);

  return (
    <div className="admin-grid">
      {query.error === "duplicate-slug" && (
        <DuplicateSlugAlert slug={query.slug} />
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">
              {moduleTitle
                ? `Новый продукт модуля «${moduleTitle}»`
                : "Новый продукт"}
            </p>
            <h2>Создать продукт</h2>
            <FormPristineHint
              formId="create-service-form"
              variant="service-create"
            >
              Подсказка: заполните базовые данные, цены и карточки обрядов при
              необходимости. Для абонемента укажите период действия.
            </FormPristineHint>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/products">
              ← К списку
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <CreateServiceForm defaultModuleKey={moduleKey ?? undefined} />
      </section>
    </div>
  );
}
