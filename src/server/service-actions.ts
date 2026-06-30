"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugifyReferralValue } from "@/lib/slugs";
import { requireServiceManager } from "@/server/auth";

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .transform((value) => value || null);

const optionalDetailsText = z
  .string()
  .trim()
  .max(30000)
  .transform((value) => value || null);

const digitsOnlyNumber = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string()
    .regex(/^\d+$/, "Разрешены только цифры")
    .transform(Number)
    .pipe(z.number().int().min(0).max(100_000_000))
);

const nullableDigitsOnlyNumber = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    return normalized === "" ? null : normalized;
  }

  return value;
}, z.union([z.null(), digitsOnlyNumber]));

const prodamusVatTaxTypes = [0, 1, 2, 4, 6, 7, 10, 11, 12, 13, 14, 15];
const SERVICE_SLUG_CODE_LENGTH = 6;
const SERVICE_SLUG_MAX_LENGTH = 120;

function validateSubscriptionPeriod(
  data: {
    isSubscription: boolean;
    subscriptionEndsAt: Date | null;
    subscriptionStartsAt: Date | null;
  },
  ctx: z.RefinementCtx
) {
  if (!data.isSubscription) {
    return;
  }

  if (!data.subscriptionStartsAt) {
    ctx.addIssue({
      code: "custom",
      message: "Укажите начало действия абонемента",
      path: ["subscriptionStartsAt"]
    });
  }

  if (!data.subscriptionEndsAt) {
    ctx.addIssue({
      code: "custom",
      message: "Укажите окончание действия абонемента",
      path: ["subscriptionEndsAt"]
    });
  }

  if (
    data.subscriptionStartsAt &&
    data.subscriptionEndsAt &&
    data.subscriptionEndsAt <= data.subscriptionStartsAt
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Окончание действия абонемента должно быть позже начала",
      path: ["subscriptionEndsAt"]
    });
  }
}

const serviceCoreSchema = z.object({
  active: z.boolean(),
  description: optionalText,
  descriptionEn: optionalText,
  descriptionHi: optionalText,
  detailsContent: optionalDetailsText,
  detailsContentEn: optionalDetailsText,
  detailsContentHi: optionalDetailsText,
  isSubscription: z.boolean(),
  priceInr: nullableDigitsOnlyNumber,
  priceRub: digitsOnlyNumber,
  receiptName: z.string().trim().min(2).max(200).nullable(),
  priceUsd: nullableDigitsOnlyNumber,
  priceUnit: z.enum(["PER_ORDER", "PER_PARTICIPANT", "PER_NAME"]),
  requiresExactParticipantList: z.boolean(),
  slug: z.string().trim().min(1).max(120),
  sortOrder: z.coerce.number().int().min(-100_000).max(100_000),
  subscriptionEndsAt: z.date().nullable(),
  subscriptionStartsAt: z.date().nullable(),
  title: z.string().trim().min(2).max(200),
  titleEn: optionalText,
  titleHi: optionalText,
  vedicGiftDescription: optionalDetailsText,
  vedicGiftEnabled: z.boolean(),
  vedicGiftTitle: optionalText,
  vatTaxType: z.coerce
    .number()
    .int()
    .refine((value) => prodamusVatTaxTypes.includes(value))
});

const serviceCreateSchema = serviceCoreSchema
  .omit({
    slug: true
  })
  .superRefine(validateSubscriptionPeriod);

const serviceUpdateSchema = serviceCoreSchema
  .omit({
    slug: true
  })
  .extend({
    id: z.string().trim().min(1)
  })
  .superRefine(validateSubscriptionPeriod);

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
  eventStartsAt: z.date().nullable(),
  id: z.string().trim().optional(),
  priceInr: nullableDigitsOnlyNumber,
  priceRub: digitsOnlyNumber,
  priceUnit: z.enum(["PER_ORDER", "PER_PARTICIPANT", "PER_NAME"]),
  priceUsd: nullableDigitsOnlyNumber,
  sortOrder: z.coerce.number().int().min(-100_000).max(100_000),
  title: z.string().trim().min(2).max(200),
  titleEn: optionalText,
  titleHi: optionalText
});

type ParsedServiceOption = z.infer<typeof serviceOptionFormSchema>;

function normalizeSlug(value: string) {
  return slugifyReferralValue(value);
}

function generateServiceSlugCode() {
  return randomBytes(SERVICE_SLUG_CODE_LENGTH / 2).toString("hex");
}

function normalizeSlugCode(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return /^[a-f0-9]{6}$/.test(normalized) ? normalized : null;
}

function buildServiceSlug(baseSlug: string, code: string) {
  const maxBaseLength =
    SERVICE_SLUG_MAX_LENGTH - SERVICE_SLUG_CODE_LENGTH - 1;
  const trimmedBaseSlug = baseSlug
    .slice(0, maxBaseLength)
    .replace(/-+$/g, "");
  const safeBaseSlug =
    trimmedBaseSlug || baseSlug.slice(0, Math.max(maxBaseLength, 1));

  return `${safeBaseSlug}-${code}`;
}

async function createUniqueServiceSlug(
  db: Pick<typeof prisma, "service">,
  baseSlug: string,
  preferredCode?: string | null
) {
  const attemptedCodes = new Set<string>();

  while (true) {
    const code =
      preferredCode && !attemptedCodes.has(preferredCode)
        ? preferredCode
        : generateServiceSlugCode();
    const slug = buildServiceSlug(baseSlug, code);
    const existingService = await db.service.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!existingService) {
      return slug;
    }

    attemptedCodes.add(code);
    preferredCode = null;
  }
}

function parseServiceFormData(formData: FormData) {
  const isSubscription = formData.get("isSubscription") === "on";
  const parsed = serviceCreateSchema.safeParse({
    active: formData.get("active") === "on",
    description: formData.get("description") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    descriptionHi: formData.get("descriptionHi") ?? "",
    detailsContent: formData.get("detailsContent") ?? "",
    detailsContentEn: formData.get("detailsContentEn") ?? "",
    detailsContentHi: formData.get("detailsContentHi") ?? "",
    isSubscription,
    vedicGiftDescription: formData.get("vedicGiftDescription") ?? "",
    vedicGiftEnabled: formData.get("vedicGiftEnabled") === "on",
    vedicGiftTitle: formData.get("vedicGiftTitle") ?? "",
    priceInr: formData.get("priceInr") || null,
    priceRub: formData.get("priceRub") ?? 0,
    priceUsd: formData.get("priceUsd") || null,
    receiptName: formData.get("receiptName") || formData.get("title"),
    priceUnit: formData.get("priceUnit") ?? "PER_PARTICIPANT",
    requiresExactParticipantList:
      formData.get("requiresExactParticipantList") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
    subscriptionEndsAt: isSubscription
      ? parseMoscowDateTime(
          formData.get("subscriptionEndsAt")?.toString(),
          "дата окончания действия абонемента"
        )
      : null,
    subscriptionStartsAt: isSubscription
      ? parseMoscowDateTime(
          formData.get("subscriptionStartsAt")?.toString(),
          "дата начала действия абонемента"
        )
      : null,
    title: formData.get("title"),
    titleEn: formData.get("titleEn") ?? "",
    titleHi: formData.get("titleHi") ?? "",
    vatTaxType: formData.get("vatTaxType") ?? 0
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные продукта");
  }

  const slugBase = normalizeSlug(parsed.data.title);
  const slugCode = normalizeSlugCode(formData.get("slugCode"));

  if (!slugBase) {
    throw new Error("Slug должен содержать латинские буквы, цифры или дефисы");
  }

  return {
    ...parsed.data,
    slugBase,
    slugCode: slugCode ?? generateServiceSlugCode()
  };
}

function parseServiceUpdateFormData(formData: FormData) {
  const isSubscription = formData.get("isSubscription") === "on";
  const parsed = serviceUpdateSchema.safeParse({
    active: formData.get("active") === "on",
    description: formData.get("description") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    descriptionHi: formData.get("descriptionHi") ?? "",
    detailsContent: formData.get("detailsContent") ?? "",
    detailsContentEn: formData.get("detailsContentEn") ?? "",
    detailsContentHi: formData.get("detailsContentHi") ?? "",
    id: formData.get("id"),
    isSubscription,
    vedicGiftDescription: formData.get("vedicGiftDescription") ?? "",
    vedicGiftEnabled: formData.get("vedicGiftEnabled") === "on",
    vedicGiftTitle: formData.get("vedicGiftTitle") ?? "",
    priceInr: formData.get("priceInr") || null,
    priceRub: formData.get("priceRub") ?? 0,
    priceUsd: formData.get("priceUsd") || null,
    receiptName: formData.get("receiptName") || formData.get("title"),
    priceUnit: formData.get("priceUnit") ?? "PER_PARTICIPANT",
    requiresExactParticipantList:
      formData.get("requiresExactParticipantList") === "on",
    sortOrder: formData.get("sortOrder") ?? 0,
    subscriptionEndsAt: isSubscription
      ? parseMoscowDateTime(
          formData.get("subscriptionEndsAt")?.toString(),
          "дата окончания действия абонемента"
        )
      : null,
    subscriptionStartsAt: isSubscription
      ? parseMoscowDateTime(
          formData.get("subscriptionStartsAt")?.toString(),
          "дата начала действия абонемента"
        )
      : null,
    title: formData.get("title"),
    titleEn: formData.get("titleEn") ?? "",
    titleHi: formData.get("titleHi") ?? "",
    vatTaxType: formData.get("vatTaxType") ?? 0
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные продукта");
  }

  return parsed.data;
}

function getAllFormValues(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => String(value));
}

function parseMoscowDateTime(
  value: string | undefined,
  fieldLabel = "дата мероприятия"
) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error(`Некорректная ${fieldLabel}`);
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 3,
      Number(minute)
    )
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Некорректная ${fieldLabel}`);
  }

  return date;
}

function normalizeTemplateTitle(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseBulkDateTime(line: string) {
  const match = line.match(
    /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?(?:[,\s]+(\d{1,2}):(\d{2}))?/
  );

  if (!match) {
    return {
      eventStartsAt: null,
      lineWithoutDate: line
    };
  }

  const [, day, month, yearValue, hour = "7", minute = "00"] = match;
  const currentYear = new Date().getFullYear();
  const fullYear = yearValue
    ? Number(yearValue.length === 2 ? `20${yearValue}` : yearValue)
    : currentYear;
  const eventStartsAt = parseMoscowDateTime(
    `${fullYear}-${month.padStart(2, "0")}-${day.padStart(
      2,
      "0"
    )}T${hour.padStart(2, "0")}:${minute}`
  );

  return {
    eventStartsAt,
    lineWithoutDate: `${line.slice(0, match.index)} ${line.slice(
      (match.index ?? 0) + match[0].length
    )}`.trim()
  };
}

function parseBulkPrice(line: string) {
  const match = line.match(/(?:^|[\s—–-])(\d[\d\s]*)\s*(?:руб\.?|₽|rub)?\s*$/i);

  if (!match) {
    return {
      lineWithoutPrice: line,
      priceRub: null
    };
  }

  return {
    lineWithoutPrice: line.slice(0, match.index).trim(),
    priceRub: Number(match[1].replace(/\s+/g, ""))
  };
}

function parseServiceOptionsFormData(formData: FormData) {
  const ids = getAllFormValues(formData, "optionId");
  const titles = getAllFormValues(formData, "optionTitle");
  const descriptions = getAllFormValues(formData, "optionDescription");
  const descriptionsEn = getAllFormValues(formData, "optionDescriptionEn");
  const descriptionsHi = getAllFormValues(formData, "optionDescriptionHi");
  const eventStartsAt = getAllFormValues(formData, "optionEventStartsAt");
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
      eventStartsAt: parseMoscowDateTime(eventStartsAt[index]),
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

function parseBulkServiceOptionsFormData(
  formData: FormData,
  sourceOptions: ParsedServiceOption[]
) {
  const bulkText = String(formData.get("optionBulkText") ?? "").trim();

  if (!bulkText) {
    return [];
  }

  return bulkText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index): ParsedServiceOption | null => {
      const { eventStartsAt, lineWithoutDate } = parseBulkDateTime(line);
      const { lineWithoutPrice, priceRub } = parseBulkPrice(lineWithoutDate);
      const parts = lineWithoutPrice
        .replace(/^[—–-]\s*/, "")
        .split(/\s+[—–-]\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
      const title = parts[0] ?? "";

      if (!title) {
        return null;
      }

      const template = sourceOptions.find(
        (option) =>
          normalizeTemplateTitle(option.title) === normalizeTemplateTitle(title)
      );

      return {
        active: true,
        delete: false,
        description:
          parts.slice(1).join(" — ") || template?.description || null,
        descriptionEn: template?.descriptionEn ?? null,
        descriptionHi: template?.descriptionHi ?? null,
        eventStartsAt,
        id: undefined,
        priceInr: template?.priceInr ?? null,
        priceRub: priceRub ?? template?.priceRub ?? 0,
        priceUnit: template?.priceUnit ?? "PER_PARTICIPANT",
        priceUsd: template?.priceUsd ?? null,
        sortOrder: sourceOptions.length + index + 1,
        title,
        titleEn: template?.titleEn ?? null,
        titleHi: template?.titleHi ?? null
      };
    })
    .filter((option): option is ParsedServiceOption => Boolean(option));
}

function compareParsedOptionsByDate(
  left: ParsedServiceOption,
  right: ParsedServiceOption
) {
  if (left.eventStartsAt && right.eventStartsAt) {
    const dateDiff =
      left.eventStartsAt.getTime() - right.eventStartsAt.getTime();

    if (dateDiff !== 0) {
      return dateDiff;
    }
  }

  if (left.eventStartsAt && !right.eventStartsAt) {
    return -1;
  }

  if (!left.eventStartsAt && right.eventStartsAt) {
    return 1;
  }

  const sortDiff = left.sortOrder - right.sortOrder;

  if (sortDiff !== 0) {
    return sortDiff;
  }

  return left.title.localeCompare(right.title, "ru");
}

function normalizeOptionSortOrders(options: ParsedServiceOption[]) {
  const visibleOptions = options
    .filter((option) => !option.delete)
    .sort(compareParsedOptionsByDate);
  const sortOrderByOption = new Map(
    visibleOptions.map((option, index) => [option, index + 1])
  );

  return options.map((option) => {
    const sortOrder = sortOrderByOption.get(option);

    if (!sortOrder) {
      return option;
    }

    return {
      ...option,
      sortOrder
    };
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
      eventStartsAt: option.eventStartsAt,
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

function isServiceSlugConflict(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return false;
  }

  const target = error.meta?.target;

  return (
    !target ||
    (Array.isArray(target) && target.includes("slug")) ||
    (typeof target === "string" && target.includes("slug"))
  );
}

export async function createService(formData: FormData) {
  await requireServiceManager();

  const { slugBase, slugCode, ...serviceData } = parseServiceFormData(formData);
  const formOptions = parseServiceOptionsFormData(formData);
  const options = normalizeOptionSortOrders([
    ...formOptions,
    ...parseBulkServiceOptionsFormData(formData, formOptions)
  ]);
  let serviceId = "";
  let nextSlugCode: string | null = slugCode;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = await createUniqueServiceSlug(prisma, slugBase, nextSlugCode);

    try {
      await prisma.$transaction(async (tx) => {
        const service = await tx.service.create({
          data: {
            ...serviceData,
            slug
          },
          select: { id: true }
        });

        serviceId = service.id;
        await saveServiceOptions(tx, service.id, options);
      });

      break;
    } catch (error) {
      if (!isServiceSlugConflict(error)) {
        throw error;
      }

      nextSlugCode = null;
    }
  }

  if (!serviceId) {
    throw new Error("Не удалось создать уникальный slug для продукта");
  }

  revalidateServicePages();
  redirect(`/admin/products/${serviceId}?created=1`);
}

export async function updateService(formData: FormData) {
  await requireServiceManager();

  const data = parseServiceUpdateFormData(formData);
  const formOptions = parseServiceOptionsFormData(formData);
  const options = normalizeOptionSortOrders([
    ...formOptions,
    ...parseBulkServiceOptionsFormData(formData, formOptions)
  ]);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: data.id },
        data: {
          active: data.active,
          description: data.description,
          descriptionEn: data.descriptionEn,
          descriptionHi: data.descriptionHi,
          detailsContent: data.detailsContent,
          detailsContentEn: data.detailsContentEn,
          detailsContentHi: data.detailsContentHi,
          priceInr: data.priceInr,
          priceRub: data.priceRub,
          priceUsd: data.priceUsd,
          priceUnit: data.priceUnit,
          receiptName: data.receiptName,
          requiresExactParticipantList: data.requiresExactParticipantList,
          isSubscription: data.isSubscription,
          sortOrder: data.sortOrder,
          subscriptionEndsAt: data.subscriptionEndsAt,
          subscriptionStartsAt: data.subscriptionStartsAt,
          title: data.title,
          titleEn: data.titleEn,
          titleHi: data.titleHi,
          vedicGiftDescription: data.vedicGiftDescription,
          vedicGiftEnabled: data.vedicGiftEnabled,
          vedicGiftTitle: data.vedicGiftTitle,
          vatTaxType: data.vatTaxType
        }
      });

      await saveServiceOptions(tx, data.id, options);
    });
  } catch (error) {
    throw error;
  }

  revalidateServicePages();
  redirect(`/admin/products/${data.id}?saved=1`);
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
  redirect(`/admin/products/${parsed.data.id}?saved=1`);
}
