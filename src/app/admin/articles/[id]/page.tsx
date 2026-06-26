import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ToggleArticleActiveForm,
  UpdateArticleForm
} from "@/components/article-form";
import { requireAdminUser } from "@/server/auth";
import { getManagedArticle } from "@/server/articles";

export const dynamic = "force-dynamic";

function formatPublishedDate(value: Date | string | null) {
  if (!value) {
    return "Без даты";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function getContentLengthLabel(content: string) {
  return `${content.trim().length.toLocaleString("ru-RU")} знаков`;
}

export default async function AdminArticleDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  await requireAdminUser("/admin/articles");

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const article = await getManagedArticle(id);

  if (!article) {
    notFound();
  }

  return (
    <div className="admin-grid">
      {(query.created || query.saved) && (
        <section className="admin-card admin-card--wide admin-success">
          <strong>{query.created ? "Статья создана" : "Сохранено"}</strong>
          <span>
            {query.created
              ? "Теперь можно проверить публикацию, переводы и изображение."
              : "Статья и публикация успешно обновлены."}
          </span>
        </section>
      )}

      <section className="admin-card admin-card--wide">
        <div className="admin-card__header">
          <div>
            <p className="eyebrow">Карточка статьи</p>
            <h2>{article.title}</h2>
            <p className="admin-muted">
              /articles/{article.slug} ·{" "}
              {formatPublishedDate(article.publishedAt)}
            </p>
          </div>
          <div className="admin-card__actions">
            <Link className="button" href="/admin/articles">
              ← К списку
            </Link>
            <Link
              className="button"
              href={`/articles/${article.slug}`}
              target="_blank"
            >
              Открыть на сайте ↗
            </Link>
            <Link className="button button--primary" href="/admin/articles/new">
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
                article.active ? "badge badge--success" : "badge badge--muted"
              }
            >
              {article.active ? "Опубликована" : "Черновик"}
            </strong>
          </div>
          <div>
            <span>Дата публикации</span>
            <strong>{formatPublishedDate(article.publishedAt)}</strong>
          </div>
          <div>
            <span>Текст RU</span>
            <strong>{getContentLengthLabel(article.content)}</strong>
          </div>
          <div>
            <span>Сортировка</span>
            <strong>{article.sortOrder}</strong>
          </div>
        </div>
      </section>

      <section className="admin-card admin-card--wide">
        <UpdateArticleForm article={article} />
        <ToggleArticleActiveForm article={article} />
      </section>
    </div>
  );
}
