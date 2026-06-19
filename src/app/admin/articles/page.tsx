import {
  ArticleEditorList,
  CreateArticleForm
} from "@/components/article-form";
import { requireAdminUser } from "@/server/auth";
import { getManagedArticles } from "@/server/articles";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireAdminUser("/admin/articles");

  const params = await searchParams;
  const articles = await getManagedArticles();
  const activeCount = articles.filter((article) => article.active).length;
  const publishedCount = articles.filter(
    (article) => article.active && article.publishedAt
  ).length;

  return (
    <div className="admin-grid">
      {params.saved && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Сохранено</strong>
          <span>Статья и публикация успешно обновлены.</span>
        </section>
      )}

      <section className="admin-card">
        <h2>Создать статью</h2>
        <p className="admin-muted">
          Статьи отображаются в публичном разделе “Статьи / О ягьях”. Текст
          поддерживает Markdown: заголовки, списки, ссылки и жирное выделение.
        </p>
        <CreateArticleForm />
      </section>

      <section className="admin-card">
        <h2>Сводка</h2>
        <div className="stats-grid">
          <div>
            <strong>{articles.length}</strong>
            <span>всего</span>
          </div>
          <div>
            <strong>{activeCount}</strong>
            <span>опубликованы</span>
          </div>
          <div>
            <strong>{publishedCount}</strong>
            <span>с датой</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <h2>Статьи</h2>
        <ArticleEditorList articles={articles} />
      </section>
    </div>
  );
}
