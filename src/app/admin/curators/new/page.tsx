import Link from "next/link";
import { CreateCuratorForm } from "@/components/create-curator-form";

export const dynamic = "force-dynamic";

export default function AdminNewCuratorPage() {
  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Новый профиль</p>
            <h2>Создать куратора</h2>
            <p className="admin-muted">
              Заполните данные доступа и настройки. После создания админка сразу
              откроет карточку куратора и покажет одноразовую подсказку с
              логином, паролем и реферальной ссылкой.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/curators">
              ← К списку
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <CreateCuratorForm redirectToDetail />
      </section>
    </div>
  );
}
