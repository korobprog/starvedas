import Link from "next/link";
import { requireAdminUser } from "@/server/auth";
import { getManagedArticles, type ManagedArticle } from "@/server/articles";

export const dynamic = "force-dynamic";

function getArticleStatusLabel(article: ManagedArticle) {
  return article.active ? "Опубликована" : "Черновик";
}

function getArticleStatusClassName(article: ManagedArticle) {
  return article.active ? "badge badge--success" : "badge badge--muted";
}

function formatPublishedDate(value: Date | string | null) {
  if (!value) {
    return "Без даты";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function getArticleExcerptPreview(article: ManagedArticle) {
  const text = article.excerpt?.trim() || article.content.trim();

  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

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
  const featuredCount = articles.filter((article) => article.featured).length;

  return (
    <div className="admin-grid">
      {params.saved && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>Сохранено</strong>
          <span>Статья и публикация успешно обновлены.</span>
        </section>
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Контент</p>
            <h2>Статьи</h2>
            <p className="admin-muted">
              Компактный список для быстрого выбора. Полный Markdown-текст,
              переводы, изображение и настройки публикации находятся внутри
              карточки статьи.
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button button--primary" href="/admin/articles/new">
              Создать статью
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
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
          <div>
            <strong>{featuredCount}</strong>
            <span>выделенные</span>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <h2>Список статей</h2>
            <p className="admin-muted">
              Нажмите на заголовок или на кнопку «…», чтобы открыть полную
              карточку редактирования.
            </p>
          </div>
        </div>

        {articles.length === 0 ? (
          <p className="admin-muted">Статьи пока не созданы.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table articles-table">
              <thead>
                <tr>
                  <th>Статья</th>
                  <th>Slug</th>
                  <th>Описание</th>
                  <th>Дата</th>
                  <th>Сорт.</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td>
                      <div className="curators-table__name">
                        <Link href={`/admin/articles/${article.id}`}>
                          {article.title}
                        </Link>
                        <div className="article-table__badges">
                          <span className={getArticleStatusClassName(article)}>
                            {getArticleStatusLabel(article)}
                          </span>
                          {article.featured && (
                            <span className="badge badge--warning">
                              Выделенная
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="table-code">/articles/{article.slug}</code>
                    </td>
                    <td>
                      <span className="table-preview">
                        {getArticleExcerptPreview(article)}
                      </span>
                    </td>
                    <td className="curators-table__metric">
                      {formatPublishedDate(article.publishedAt)}
                    </td>
                    <td className="curators-table__metric">
                      {article.sortOrder}
                    </td>
                    <td className="curators-table__actions">
                      <Link
                        aria-label={`Открыть карточку статьи ${article.title}`}
                        className="icon-button icon-button--menu"
                        href={`/admin/articles/${article.id}`}
                        title="Открыть карточку"
                      >
                        …
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
