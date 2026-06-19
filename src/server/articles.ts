import type { Prisma } from "@prisma/client";
import { normalizeLocale, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

const publicArticleSelect = {
  content: true,
  contentEn: true,
  contentHi: true,
  coverImageUrl: true,
  createdAt: true,
  excerpt: true,
  excerptEn: true,
  excerptHi: true,
  id: true,
  publishedAt: true,
  slug: true,
  title: true,
  titleEn: true,
  titleHi: true
} satisfies Prisma.ArticleSelect;

const managedArticleSelect = {
  active: true,
  content: true,
  contentEn: true,
  contentHi: true,
  coverImageUrl: true,
  createdAt: true,
  excerpt: true,
  excerptEn: true,
  excerptHi: true,
  featured: true,
  id: true,
  publishedAt: true,
  slug: true,
  sortOrder: true,
  title: true,
  titleEn: true,
  titleHi: true,
  updatedAt: true
} satisfies Prisma.ArticleSelect;

type PublicArticleRow = Prisma.ArticleGetPayload<{
  select: typeof publicArticleSelect;
}>;

export type PublicArticle = PublicArticleRow & {
  localizedContent: string;
  localizedExcerpt: string;
  localizedTitle: string;
};

export type ManagedArticle = Prisma.ArticleGetPayload<{
  select: typeof managedArticleSelect;
}>;

function getLocalizedTitle(article: PublicArticleRow, locale: Locale) {
  if (locale === "en") {
    return article.titleEn?.trim() || article.title;
  }

  if (locale === "hi") {
    return article.titleHi?.trim() || article.titleEn?.trim() || article.title;
  }

  return article.title;
}

function getLocalizedExcerpt(article: PublicArticleRow, locale: Locale) {
  if (locale === "en") {
    return article.excerptEn?.trim() || article.excerpt || "";
  }

  if (locale === "hi") {
    return (
      article.excerptHi?.trim() ||
      article.excerptEn?.trim() ||
      article.excerpt ||
      ""
    );
  }

  return article.excerpt || "";
}

function getLocalizedContent(article: PublicArticleRow, locale: Locale) {
  if (locale === "en") {
    return article.contentEn?.trim() || article.content;
  }

  if (locale === "hi") {
    return (
      article.contentHi?.trim() || article.contentEn?.trim() || article.content
    );
  }

  return article.content;
}

function toPublicArticle(
  article: PublicArticleRow,
  localeValue?: string | null
): PublicArticle {
  const locale = normalizeLocale(localeValue);

  return {
    ...article,
    localizedContent: getLocalizedContent(article, locale),
    localizedExcerpt: getLocalizedExcerpt(article, locale),
    localizedTitle: getLocalizedTitle(article, locale)
  };
}

export async function getPublicArticles(locale?: string | null) {
  const articles = await prisma.article.findMany({
    where: { active: true },
    orderBy: [
      { sortOrder: "asc" },
      { publishedAt: "desc" },
      { createdAt: "desc" }
    ],
    select: publicArticleSelect
  });

  return articles.map((article) => toPublicArticle(article, locale));
}

export async function getPublicArticleBySlug(
  slug: string,
  locale?: string | null
) {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const article = await prisma.article.findFirst({
    where: {
      active: true,
      slug: normalizedSlug
    },
    select: publicArticleSelect
  });

  return article ? toPublicArticle(article, locale) : null;
}

export async function getManagedArticles(): Promise<ManagedArticle[]> {
  return prisma.article.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
    select: managedArticleSelect
  });
}
