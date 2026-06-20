import Link from "next/link";
import { CreateArticleForm } from "@/components/article-form";
import { requireAdminUser } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminNewArticlePage() {
  await requireAdminUser("/admin/articles");

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Новая статья</p>
            <h2>Создать статью</h2>
            <p className="admin-muted">
              Статьи отображаются в публичном разделе “Статьи / О ягьях”. Текст
              поддерживает Markdown: заголовки, списки, ссылки и жирное
              выделение.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/articles">
              ← К списку
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <CreateArticleForm />
      </section>
    </div>
  );
}
