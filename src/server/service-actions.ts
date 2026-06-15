"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireServiceManager } from "@/server/auth";

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .transform((value) => value || null);

const serviceBaseSchema = z.object({
  active: z.boolean(),
  description: optionalText,
  priceRub: z.coerce.number().int().min(0).max(100_000_000),
  priceUnit: z.enum(["PER_ORDER", "PER_PARTICIPANT", "PER_NAME"]),
  requiresExactParticipantList: z.boolean(),
  slug: z.string().trim().min(1).max(120),
  sortOrder: z.coerce.number().int().min(-100_000).max(100_000),
  title: z.string().trim().min(2).max(200)
});

const serviceUpdateSchema = serviceBaseSchema.extend({
  id: z.string().trim().min(1)
});

const toggleServiceSchema = z.object({
  active: z.boolean(),
  id: z.string().trim().min(1)
});

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function parseServiceFormData(formData: FormData) {
  const parsed = serviceBaseSchema.safeParse({
    active: formData.get("active") === "on",
    description: formData.get("description") ?? "",
    priceRub: formData.get("priceRub") ?? 0,
    priceUnit: formData.get("priceUnit") ?? "PER_PARTICIPANT",
    requiresExactParticipantList:
      formData.get("requiresExactParticipantList") === "on",
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") ?? 0,
    title: formData.get("title")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные продукта");
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

function parseServiceUpdateFormData(formData: FormData) {
  const parsed = serviceUpdateSchema.safeParse({
    active: formData.get("active") === "on",
    description: formData.get("description") ?? "",
    id: formData.get("id"),
    priceRub: formData.get("priceRub") ?? 0,
    priceUnit: formData.get("priceUnit") ?? "PER_PARTICIPANT",
    requiresExactParticipantList:
      formData.get("requiresExactParticipantList") === "on",
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") ?? 0,
    title: formData.get("title")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные продукта");
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

function revalidateServicePages() {
  revalidatePath("/");
  revalidatePath("/admin/products");
  revalidatePath("/cabinet");
}

function handlePrismaError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new Error("Продукт с таким slug уже существует");
  }

  throw error;
}

export async function createService(formData: FormData) {
  await requireServiceManager();

  const data = parseServiceFormData(formData);

  try {
    await prisma.service.create({
      data
    });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidateServicePages();
}

export async function updateService(formData: FormData) {
  await requireServiceManager();

  const data = parseServiceUpdateFormData(formData);

  try {
    await prisma.service.update({
      where: { id: data.id },
      data: {
        active: data.active,
        description: data.description,
        priceRub: data.priceRub,
        priceUnit: data.priceUnit,
        requiresExactParticipantList: data.requiresExactParticipantList,
        slug: data.slug,
        sortOrder: data.sortOrder,
        title: data.title
      }
    });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidateServicePages();
}

export async function toggleServiceActive(formData: FormData) {
  await requireServiceManager();

  const parsed = toggleServiceSchema.safeParse({
    active: formData.get("active") === "true",
    id: formData.get("id")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные продукта");
  }

  await prisma.service.update({
    where: { id: parsed.data.id },
    data: {
      active: parsed.data.active
    }
  });

  revalidateServicePages();
}
