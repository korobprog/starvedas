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

const prodamusVatTaxTypes = [0, 1, 2, 4, 6, 7, 10, 11, 12, 13, 14, 15];

const serviceBaseSchema = z.object({
  active: z.boolean(),
  description: optionalText,
  descriptionEn: optionalText,
  descriptionHi: optionalText,
  priceInr: z.coerce.number().int().min(0).max(100_000_000).nullable(),
  priceRub: z.coerce.number().int().min(0).max(100_000_000),
  receiptName: z.string().trim().min(2).max(200).nullable(),
  priceUsd: z.coerce.number().int().min(0).max(100_000_000).nullable(),
  priceUnit: z.enum(["PER_ORDER", "PER_PARTICIPANT", "PER_NAME"]),
  requiresExactParticipantList: z.boolean(),
  slug: z.string().trim().min(1).max(120),
  sortOrder: z.coerce.number().int().min(-100_000).max(100_000),
  title: z.string().trim().min(2).max(200),
  titleEn: optionalText,
  titleHi: optionalText,
  vatTaxType: z.coerce
    .number()
    .int()
    .refine((value) => prodamusVatTaxTypes.includes(value))
});

const serviceUpdateSchema = serviceBaseSchema.extend({
  id: z.string().trim().min(1)
});

const toggleServiceSchema = z.object({
  active: z.boolean(),
  id: z.string().trim().min(1)
});

const serviceOptionFormSchema = z.object({
  active: z.boolean(),
  delete: z.boolean(),
  description: optionalText,
  descriptionEn: optionalText,
  descriptionHi: optionalText,
  id: z.string().trim().optional(),
  priceInr: z.coerce.number().int().min(0).max(100_000_000).nullable(),
  priceRub: z.coerce.number().int().min(0).max(100_000_000),
  priceUnit: z.enum(["PER_ORDER", "PER_PARTICIPANT", "PER_NAME"]),
  priceUsd: z.coerce.number().int().min(0).max(100_000_000).nullable(),
  sortOrder: z.coerce.number().int().min(-100_000).max(100_000),
  title: z.string().trim().min(2).max(200),
  titleEn: optionalText,
  titleHi: optionalText
});

type ParsedServiceOption = z.infer<typeof serviceOptionFormSchema>;

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
    descriptionEn: formData.get("descriptionEn") ?? "",
    descriptionHi: formData.get("descriptionHi") ?? "",
    priceInr: formData.get("priceInr") || null,
    priceRub: formData.get("priceRub") ?? 0,
    priceUsd: formData.get("priceUsd") || null,
    receiptName: formData.get("receiptName") || formData.get("title"),
    priceUnit: formData.get("priceUnit") ?? "PER_PARTICIPANT",
    requiresExactParticipantList:
      formData.get("requiresExactParticipantList") === "on",
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") ?? 0,
    title: formData.get("title"),
    titleEn: formData.get("titleEn") ?? "",
    titleHi: formData.get("titleHi") ?? "",
    vatTaxType: formData.get("vatTaxType") ?? 0
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
    descriptionEn: formData.get("descriptionEn") ?? "",
    descriptionHi: formData.get("descriptionHi") ?? "",
    id: formData.get("id"),
    priceInr: formData.get("priceInr") || null,
    priceRub: formData.get("priceRub") ?? 0,
    priceUsd: formData.get("priceUsd") || null,
    receiptName: formData.get("receiptName") || formData.get("title"),
    priceUnit: formData.get("priceUnit") ?? "PER_PARTICIPANT",
    requiresExactParticipantList:
      formData.get("requiresExactParticipantList") === "on",
    slug: formData.get("slug"),
    sortOrder: formData.get("sortOrder") ?? 0,
    title: formData.get("title"),
    titleEn: formData.get("titleEn") ?? "",
    titleHi: formData.get("titleHi") ?? "",
    vatTaxType: formData.get("vatTaxType") ?? 0
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

function getAllFormValues(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => String(value));
}

function parseServiceOptionsFormData(formData: FormData) {
  const ids = getAllFormValues(formData, "optionId");
  const titles = getAllFormValues(formData, "optionTitle");
  const descriptions = getAllFormValues(formData, "optionDescription");
  const descriptionsEn = getAllFormValues(formData, "optionDescriptionEn");
  const descriptionsHi = getAllFormValues(formData, "optionDescriptionHi");
  const pricesRub = getAllFormValues(formData, "optionPriceRub");
  const pricesUsd = getAllFormValues(formData, "optionPriceUsd");
  const pricesInr = getAllFormValues(formData, "optionPriceInr");
  const priceUnits = getAllFormValues(formData, "optionPriceUnit");
  const sortOrders = getAllFormValues(formData, "optionSortOrder");
  const titlesEn = getAllFormValues(formData, "optionTitleEn");
  const titlesHi = getAllFormValues(formData, "optionTitleHi");
  const activeFlags = new Set(getAllFormValues(formData, "optionActive"));
  const deleteFlags = new Set(getAllFormValues(formData, "optionDelete"));

  return titles.map((title, index) => {
    const parsed = serviceOptionFormSchema.safeParse({
      active: activeFlags.has(String(index)),
      delete: deleteFlags.has(String(index)),
      description: descriptions[index] ?? "",
      descriptionEn: descriptionsEn[index] ?? "",
      descriptionHi: descriptionsHi[index] ?? "",
      id: ids[index] || undefined,
      priceInr: pricesInr[index] || null,
      priceRub: pricesRub[index] ?? 0,
      priceUnit: priceUnits[index] || "PER_PARTICIPANT",
      priceUsd: pricesUsd[index] || null,
      sortOrder: sortOrders[index] ?? index + 1,
      title,
      titleEn: titlesEn[index] ?? "",
      titleHi: titlesHi[index] ?? ""
    });

    if (!parsed.success) {
      throw new Error("Некорректные данные карточки обряда");
    }

    return parsed.data;
  });
}

async function saveServiceOptions(
  tx: Prisma.TransactionClient,
  serviceId: string,
  options: ParsedServiceOption[]
) {
  for (const option of options) {
    if (option.delete) {
      if (!option.id) {
        continue;
      }

      const existing = await tx.serviceOption.findFirst({
        where: { id: option.id, serviceId },
        select: {
          _count: {
            select: { orderItems: true }
          },
          id: true
        }
      });

      if (!existing) {
        continue;
      }

      if (existing._count.orderItems > 0) {
        await tx.serviceOption.update({
          where: { id: existing.id },
          data: { active: false }
        });
      } else {
        await tx.serviceOption.delete({
          where: { id: existing.id }
        });
      }

      continue;
    }

    const data = {
      active: option.active,
      description: option.description,
      descriptionEn: option.descriptionEn,
      descriptionHi: option.descriptionHi,
      priceInr: option.priceInr,
      priceRub: option.priceRub,
      priceUnit: option.priceUnit,
      priceUsd: option.priceUsd,
      sortOrder: option.sortOrder,
      title: option.title,
      titleEn: option.titleEn,
      titleHi: option.titleHi
    };

    if (option.id) {
      await tx.serviceOption.updateMany({
        where: { id: option.id, serviceId },
        data
      });
    } else {
      await tx.serviceOption.create({
        data: {
          ...data,
          serviceId
        }
      });
    }
  }
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
  const options = parseServiceOptionsFormData(formData);

  try {
    await prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data,
        select: { id: true }
      });

      await saveServiceOptions(tx, service.id, options);
    });
  } catch (error) {
    handlePrismaError(error);
  }

  revalidateServicePages();
}

export async function updateService(formData: FormData) {
  await requireServiceManager();

  const data = parseServiceUpdateFormData(formData);
  const options = parseServiceOptionsFormData(formData);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: data.id },
        data: {
          active: data.active,
          description: data.description,
          descriptionEn: data.descriptionEn,
          descriptionHi: data.descriptionHi,
          priceInr: data.priceInr,
          priceRub: data.priceRub,
          priceUsd: data.priceUsd,
          priceUnit: data.priceUnit,
          receiptName: data.receiptName,
          requiresExactParticipantList: data.requiresExactParticipantList,
          slug: data.slug,
          sortOrder: data.sortOrder,
          title: data.title,
          titleEn: data.titleEn,
          titleHi: data.titleHi,
          vatTaxType: data.vatTaxType
        }
      });

      await saveServiceOptions(tx, data.id, options);
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
