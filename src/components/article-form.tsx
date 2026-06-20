import { AdminSubmitButton } from "@/components/admin-submit-button";
import {
  createArticle,
  toggleArticleActive,
  updateArticle
} from "@/server/article-actions";
import type { ManagedArticle } from "@/server/articles";

export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function ArticleFields({
  article
}: Readonly<{
  article?: ManagedArticle;
}>) {
  return (
    <>
      <div className="field-grid">
        <label className="field">
          <span>Заголовок RU</span>
          <input
            defaultValue={article?.title ?? ""}
            name="title"
            required
            type="text"
          />
        </label>
        <label className="field">
          <span>Slug</span>
          <input
            defaultValue={article?.slug ?? ""}
            name="slug"
            placeholder="chto-takoe-yagya"
            required
            type="text"
          />
        </label>
        <label className="field">
          <span>Сортировка</span>
          <input
            defaultValue={article?.sortOrder ?? 0}
            name="sortOrder"
            type="number"
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Заголовок EN</span>
          <input
            defaultValue={article?.titleEn ?? ""}
            name="titleEn"
            type="text"
          />
        </label>
        <label className="field">
          <span>Заголовок HI</span>
          <input
            defaultValue={article?.titleHi ?? ""}
            name="titleHi"
            type="text"
          />
        </label>
      </div>

      <label className="field">
        <span>Краткое описание RU</span>
        <textarea
          defaultValue={article?.excerpt ?? ""}
          name="excerpt"
          rows={2}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Краткое описание EN</span>
          <textarea
            defaultValue={article?.excerptEn ?? ""}
            name="excerptEn"
            rows={2}
          />
        </label>
        <label className="field">
          <span>Краткое описание HI</span>
          <textarea
            defaultValue={article?.excerptHi ?? ""}
            name="excerptHi"
            rows={2}
          />
        </label>
      </div>

      <label className="field">
        <span>Текст статьи RU, Markdown</span>
        <textarea
          defaultValue={article?.content ?? ""}
          name="content"
          required
          rows={12}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Текст статьи EN, Markdown</span>
          <textarea
            defaultValue={article?.contentEn ?? ""}
            name="contentEn"
            rows={8}
          />
        </label>
        <label className="field">
          <span>Текст статьи HI, Markdown</span>
          <textarea
            defaultValue={article?.contentHi ?? ""}
            name="contentHi"
            rows={8}
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>URL изображения</span>
          <input
            defaultValue={article?.coverImageUrl ?? ""}
            name="coverImageUrl"
            placeholder="https://..."
            type="url"
          />
        </label>
        <label className="field">
          <span>Дата публикации</span>
          <input
            defaultValue={formatDateInput(article?.publishedAt)}
            name="publishedAt"
            type="date"
          />
        </label>
      </div>

      <label className="checkbox-field">
        <input
          defaultChecked={article?.featured ?? false}
          name="featured"
          type="checkbox"
        />
        <span>Выделенная статья</span>
      </label>

      <label className="checkbox-field">
        <input
          defaultChecked={article?.active ?? true}
          name="active"
          type="checkbox"
        />
        <span>Опубликована</span>
      </label>
    </>
  );
}

export function CreateArticleForm() {
  return (
    <form action={createArticle} className="admin-form">
      <ArticleFields />
      <AdminSubmitButton className="button button--primary">
        Создать статью
      </AdminSubmitButton>
    </form>
  );
}

export function UpdateArticleForm({
  article
}: Readonly<{
  article: ManagedArticle;
}>) {
  return (
    <form action={updateArticle} className="admin-form">
      <input name="id" type="hidden" value={article.id} />
      <ArticleFields article={article} />
      <AdminSubmitButton className="button button--primary">
        Сохранить
      </AdminSubmitButton>
    </form>
  );
}

export function ToggleArticleActiveForm({
  article
}: Readonly<{
  article: ManagedArticle;
}>) {
  return (
    <form action={toggleArticleActive}>
      <input name="id" type="hidden" value={article.id} />
      <input name="slug" type="hidden" value={article.slug} />
      <input
        name="active"
        type="hidden"
        value={article.active ? "false" : "true"}
      />
      <AdminSubmitButton>
        {article.active ? "Снять с публикации" : "Опубликовать"}
      </AdminSubmitButton>
    </form>
  );
}

export function ArticleEditorList({
  articles
}: Readonly<{
  articles: ManagedArticle[];
}>) {
  if (articles.length === 0) {
    return <p className="admin-muted">Статьи пока не созданы.</p>;
  }

  return (
    <div className="admin-list">
      {articles.map((article) => (
        <article className="admin-list-item" key={article.id}>
          <div className="admin-list-item__header">
            <div>
              <h3>{article.title}</h3>
              <p className="admin-muted">
                /articles/{article.slug} · сортировка {article.sortOrder}
              </p>
            </div>
            <span className="badge">
              {article.active ? "Опубликована" : "Черновик"}
            </span>
          </div>

          <form action={updateArticle} className="admin-form">
            <input name="id" type="hidden" value={article.id} />
            <ArticleFields article={article} />
            <AdminSubmitButton className="button button--primary">
              Сохранить
            </AdminSubmitButton>
          </form>

          <form action={toggleArticleActive}>
            <input name="id" type="hidden" value={article.id} />
            <input name="slug" type="hidden" value={article.slug} />
            <input
              name="active"
              type="hidden"
              value={article.active ? "false" : "true"}
            />
            <AdminSubmitButton>
              {article.active ? "Снять с публикации" : "Опубликовать"}
            </AdminSubmitButton>
          </form>
        </article>
      ))}
    </div>
  );
}
