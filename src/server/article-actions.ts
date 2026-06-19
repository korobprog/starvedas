"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/auth";

const optionalText = z
  .string()
  .trim()
  .max(100_000)
  .transform((value) => value || null);

const articleBaseSchema = z.object({
  active: z.boolean(),
  content: z.string().trim().min(10).max(200_000),
  contentEn: optionalText,
  contentHi: optionalText,
  coverImageUrl: optionalText,
  excerpt: optionalText,
  excerptEn: optionalText,
  excerptHi: optionalText,
  featured: z.boolean(),
  publishedAt: z.date().nullable(),
  slug: z.string().trim().min(1).max(160),
  sortOrder: z.coerce.number().int().min(-100_000).max(100_000),
  title: z.string().trim().min(2).max(220),
  titleEn: optionalText,
  titleHi: optionalText
});

const articleUpdateSchema = articleBaseSchema.extend({
  id: z.string().trim().min(1)
});

const toggleArticleSchema = z.object({
  active: z.boolean(),
  id: z.string().trim().min(1),
  slug: z.string().trim().min(1)
});

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parsePublishedAt(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error("Некорректная дата публикации");
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (Number.isNaN(date.getTime())) {
    throw new Error("Некорректная дата публикации");
  }

  return date;
}

function parseArticleFormData(formData: FormData) {
  const parsed = articleBaseSchema.safeParse({
    active: formData.get("active") === "on",
    content: formData.get("content") ?? "",
    contentEn: formData.get("contentEn") ?? "",
    contentHi: formData.get("contentHi") ?? "",
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    excerptEn: formData.get("excerptEn") ?? "",
    excerptHi: formData.get("excerptHi") ?? "",
    featured: formData.get("featured") === "on",
    publishedAt: parsePublishedAt(formData.get("publishedAt")),
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") ?? 0,
    title: formData.get("title"),
    titleEn: formData.get("titleEn") ?? "",
    titleHi: formData.get("titleHi") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные статьи");
  }

  const slug = normalizeSlug(parsed.data.slug);

  if (!slug) {
    throw new Error("Slug должен содержать латинские буквы, цифры или дефисы");
  }

  return {
    ...parsed.data,
    slug
  };
}

function parseArticleUpdateFormData(formData: FormData) {
  const data = parseArticleFormData(formData);
  const parsed = articleUpdateSchema.safeParse({
    ...data,
    id: formData.get("id")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные статьи");
  }

  return parsed.data;
}

function revalidateArticlePages(slug?: string) {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/admin/articles");

  if (slug) {
    revalidatePath(`/articles/${slug}`);
  }
}

function handlePrismaError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new Error("Статья с таким slug уже существует");
  }

  throw error;
}

export async function createArticle(formData: FormData) {
  await requireAdminUser("/admin/articles");

  const data = parseArticleFormData(formData);

  try {
    await prisma.article.create({ data });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidateArticlePages(data.slug);
  redirect("/admin/articles?saved=1");
}

export async function updateArticle(formData: FormData) {
  await requireAdminUser("/admin/articles");

  const data = parseArticleUpdateFormData(formData);

  try {
    await prisma.article.update({
      where: { id: data.id },
      data: {
        active: data.active,
        content: data.content,
        contentEn: data.contentEn,
        contentHi: data.contentHi,
        coverImageUrl: data.coverImageUrl,
        excerpt: data.excerpt,
        excerptEn: data.excerptEn,
        excerptHi: data.excerptHi,
        featured: data.featured,
        publishedAt: data.publishedAt,
        slug: data.slug,
        sortOrder: data.sortOrder,
        title: data.title,
        titleEn: data.titleEn,
        titleHi: data.titleHi
      }
    });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidateArticlePages(data.slug);
  redirect("/admin/articles?saved=1");
}

export async function toggleArticleActive(formData: FormData) {
  await requireAdminUser("/admin/articles");

  const parsed = toggleArticleSchema.safeParse({
    active: formData.get("active") === "true",
    id: formData.get("id"),
    slug: formData.get("slug")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные статьи");
  }

  await prisma.article.update({
    where: { id: parsed.data.id },
    data: { active: parsed.data.active }
  });

  revalidateArticlePages(parsed.data.slug);
  redirect("/admin/articles?saved=1");
}
