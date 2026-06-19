import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { localeCookieName } from "@/i18n/config";
import { getPublicArticleBySlug } from "@/server/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);

  if (!article) {
    return {
      title: "Статья не найдена, StarVedas"
    };
  }

  return {
    title: `${article.title}, StarVedas`,
    description: article.excerpt || undefined
  };
}

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

export default async function ArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, cookieStore] = await Promise.all([params, cookies()]);
  const locale = cookieStore.get(localeCookieName)?.value;
  const article = await getPublicArticleBySlug(slug, locale);

  if (!article) {
    notFound();
  }

  return (
    <main className="legal-page">
      <article className="legal-card article-detail">
        <p className="eyebrow">Статьи / О ягьях</p>
        <h1>{article.localizedTitle}</h1>
        {article.publishedAt && (
          <time className="article-meta">
            {formatPublishedDate(article.publishedAt)}
          </time>
        )}
        {article.localizedExcerpt && (
          <p className="legal-lead">{article.localizedExcerpt}</p>
        )}
        {article.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="article-detail__image"
            src={article.coverImageUrl}
          />
        )}
        <MarkdownContent content={article.localizedContent} />
        <div className="legal-actions">
          <Link className="button" href="/articles">
            Все статьи
          </Link>
          <Link className="button button--primary" href="/#signup">
            Записаться на церемонию
          </Link>
        </div>
      </article>
    </main>
  );
}
