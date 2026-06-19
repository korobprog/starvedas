import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { localeCookieName } from "@/i18n/config";
import { getPublicArticles } from "@/server/articles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Статьи о ягьях и ведических церемониях, StarVedas",
  description:
    "Материалы StarVedas о ягьях, пуджах, обрядах и подготовке к церемониям."
};

function formatPublishedDate(value: Date | string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

export default async function ArticlesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value;
  const articles = await getPublicArticles(locale);

  return (
    <main className="page-shell">
      <section className="section" id="articles">
        <div className="container">
          <div className="section__header">
            <p className="eyebrow">Статьи / О ягьях</p>
            <h1>Статьи и описания</h1>
            <p>
              Здесь собраны объяснения, что такое ягья, пуджа, как проходит
              участие в обрядах и как подготовиться к церемонии.
            </p>
          </div>

          {articles.length > 0 ? (
            <div className="card-grid article-grid">
              {articles.map((article) => (
                <Link
                  className="card card--link article-card"
                  href={`/articles/${article.slug}`}
                  key={article.id}
                >
                  {article.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="article-card__image"
                      src={article.coverImageUrl}
                    />
                  )}
                  <div className="article-card__body">
                    {article.publishedAt && (
                      <time className="article-meta">
                        {formatPublishedDate(article.publishedAt)}
                      </time>
                    )}
                    <h2>{article.localizedTitle}</h2>
                    {article.localizedExcerpt && (
                      <p>{article.localizedExcerpt}</p>
                    )}
                    <span className="article-card__link">Читать</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="simple-card">
              <h2>Статьи скоро появятся</h2>
              <p>
                Администратор сможет добавить материалы в разделе админки
                “Статьи”.
              </p>
              <Link className="button button--primary" href="/#signup">
                Перейти к записи
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
