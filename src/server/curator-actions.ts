"use server";

import crypto from "node:crypto";
import { Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugifyReferralValue } from "@/lib/slugs";
import { requireUser } from "@/server/auth";
import { hashPassword } from "@/server/password";
import {
  adminCuratorSlug,
  buildReferralPath,
  chintamaniAdminCuratorSlug,
  ensureSystemCurator
} from "@/server/referrals";
import {
  isSafeSupportUrl,
  normalizeSupportUrlInput
} from "@/server/support-links";

export type CreateCuratorState = {
  credentials?: {
    email: string;
    password: string;
    referralPath: string;
  };
  curatorId?: string;
  error?: string;
  message?: string;
};

const optionalText = z
  .string()
  .trim()
  .max(5000)
  .transform((value) => value || null);

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: "Ссылка должна начинаться с http:// или https://"
  })
  .transform((value) => value || null);

const optionalSupportUrl = z
  .string()
  .trim()
  .max(2000)
  .transform(normalizeSupportUrlInput)
  .refine(isSafeSupportUrl, {
    message:
      "Укажите http(s)-ссылку, email, телефон, mailto:, tel: или Telegram @username"
  });

const optionalButtonLabel = z
  .string()
  .trim()
  .max(80)
  .transform((value) => value || null);

const optionalTelegramId = z
  .string()
  .trim()
  .max(32)
  .refine((value) => !value || /^\d{4,32}$/.test(value), {
    message: "Telegram ID должен состоять только из цифр"
  })
  .transform((value) => value || null);

const createCuratorSchema = z.object({
  canEditPostPurchase: z.boolean(),
  canEditSupport: z.boolean(),
  canViewClients: z.boolean(),
  email: z.string().trim().email(),
  hidden: z.boolean(),
  name: z.string().trim().min(2).max(120),
  password: z.string().trim().max(120).optional(),
  postPurchaseText: optionalText,
  postPurchaseTitle: optionalText,
  postPurchaseUrl: optionalUrl,
  showMailingConsentCheckbox: z.boolean(),
  slug: z.string().trim().max(120).optional(),
  supportButtonLabel: optionalButtonLabel,
  supportEnabled: z.boolean(),
  supportUrl: optionalSupportUrl,
  telegramId: optionalTelegramId
});

const updateCuratorSchema = z.object({
  active: z.boolean(),
  canEditPostPurchase: z.boolean(),
  canEditSupport: z.boolean(),
  canViewClients: z.boolean(),
  email: z
    .union([z.string().trim().email(), z.literal("")])
    .transform((value) => value || null),
  hidden: z.boolean(),
  id: z.string().trim().min(1),
  name: z.string().trim().min(2).max(120),
  password: z.string().trim().max(120).optional(),
  postPurchaseText: optionalText,
  postPurchaseTitle: optionalText,
  postPurchaseUrl: optionalUrl,
  showMailingConsentCheckbox: z.boolean(),
  slug: z.string().trim().min(2).max(120),
  supportButtonLabel: optionalButtonLabel,
  supportEnabled: z.boolean(),
  supportUrl: optionalSupportUrl,
  telegramId: optionalTelegramId
});

const cabinetSettingsSchema = z.object({
  postPurchaseText: optionalText,
  postPurchaseTitle: optionalText,
  postPurchaseUrl: optionalUrl,
  showMailingConsentCheckbox: z.boolean(),
  supportButtonLabel: optionalButtonLabel,
  supportUrl: optionalSupportUrl
});

const curatorReferralLinkSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2).max(120)
});

function slugify(value: string) {
  return (
    slugifyReferralValue(value) ||
    `curator-${crypto.randomBytes(4).toString("hex")}`
  );
}

async function createUniqueSlug(value: string, currentId?: string) {
  const base = slugify(value);
  let slug = base;
  let index = 2;

  while (true) {
    const [curator, referralLink] = await Promise.all([
      prisma.curator.findFirst({
        where: {
          id: currentId ? { not: currentId } : undefined,
          slug
        },
        select: { id: true }
      }),
      prisma.referralLink.findFirst({
        where: {
          curatorId: currentId ? { not: currentId } : undefined,
          slug
        },
        select: { id: true }
      })
    ]);

    if (!curator && !referralLink) {
      return slug;
    }

    slug = `${base}-${index}`;
    index += 1;
  }
}

async function setPrimaryReferralLink(
  tx: Prisma.TransactionClient,
  curatorId: string,
  slug: string,
  active: boolean
) {
  await tx.referralLink.updateMany({
    where: {
      curatorId,
      isPrimary: true,
      slug: {
        not: slug
      }
    },
    data: {
      isPrimary: false
    }
  });

  const existingLink = await tx.referralLink.findUnique({
    where: {
      slug
    },
    select: {
      curatorId: true,
      id: true
    }
  });

  if (existingLink && existingLink.curatorId !== curatorId) {
    throw new Error("Реферальная ссылка уже занята");
  }

  if (existingLink) {
    await tx.referralLink.update({
      where: {
        id: existingLink.id
      },
      data: {
        active,
        isPrimary: true
      }
    });
    return;
  }

  await tx.referralLink.create({
    data: {
      active,
      curatorId,
      isPrimary: true,
      slug
    }
  });
}

function generateTemporaryPassword() {
  return crypto.randomBytes(9).toString("base64url");
}

function getSystemCuratorSlug(slug: string) {
  return slug === chintamaniAdminCuratorSlug
    ? chintamaniAdminCuratorSlug
    : adminCuratorSlug;
}

function getSystemCuratorUserRole(slug: string) {
  return slug === chintamaniAdminCuratorSlug
    ? UserRole.ADMIN
    : UserRole.SUPER_ADMIN;
}

async function ensureEmailAvailable(email: string, currentUserId?: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  return !existing || existing.id === currentUserId;
}

function revalidateCuratorPages() {
  revalidatePath("/");
  revalidatePath("/admin/curators");
  revalidatePath("/cabinet");
}

async function getCabinetCuratorIdForUser() {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );

  return user.role === UserRole.CURATOR
    ? user.curator?.id
    : (await ensureSystemCurator()).id;
}

async function requireCabinetCuratorId() {
  const curatorId = await getCabinetCuratorIdForUser();

  if (!curatorId) {
    throw new Error("Профиль куратора не найден");
  }

  return curatorId;
}

export async function createCuratorAction(
  _state: CreateCuratorState,
  formData: FormData
): Promise<CreateCuratorState> {
  await requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], "/admin/curators");

  const parsed = createCuratorSchema.safeParse({
    canEditPostPurchase: formData.get("canEditPostPurchase") === "on",
    canEditSupport: formData.get("canEditSupport") === "on",
    canViewClients: formData.get("canViewClients") === "on",
    email: formData.get("email"),
    hidden: formData.get("hidden") === "on",
    name: formData.get("name"),
    password: formData.get("password") || undefined,
    postPurchaseText: formData.get("postPurchaseText") ?? "",
    postPurchaseTitle: formData.get("postPurchaseTitle") ?? "",
    postPurchaseUrl: formData.get("postPurchaseUrl") ?? "",
    showMailingConsentCheckbox:
      formData.get("showMailingConsentCheckbox") === "on",
    slug: formData.get("slug") || undefined,
    supportButtonLabel: formData.get("supportButtonLabel") ?? "",
    supportEnabled: formData.get("supportEnabled") === "on",
    supportUrl: formData.get("supportUrl") ?? "",
    telegramId: formData.get("telegramId") ?? ""
  });

  if (!parsed.success) {
    return { error: "Проверьте имя, email, ссылки и текст" };
  }

  const data = parsed.data;

  if (!(await ensureEmailAvailable(data.email))) {
    return { error: "Пользователь с таким email уже существует" };
  }

  const password = data.password || generateTemporaryPassword();
  const slug = await createUniqueSlug(data.slug || data.name);
  let curatorId = "";

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: await hashPassword(password),
        role: UserRole.CURATOR
      },
      select: { id: true }
    });

    const curator = await tx.curator.create({
      data: {
        canEditPostPurchase: data.canEditPostPurchase,
        canEditSupport: data.canEditSupport,
        canViewClients: data.canViewClients,
        hidden: data.hidden,
        name: data.name,
        postPurchaseText: data.postPurchaseText,
        postPurchaseTitle: data.postPurchaseTitle,
        postPurchaseUrl: data.postPurchaseUrl,
        showMailingConsentCheckbox: data.showMailingConsentCheckbox,
        slug,
        supportButtonLabel: data.supportButtonLabel,
        supportEnabled: data.supportEnabled,
        supportUrl: data.supportUrl,
        telegramId: data.telegramId,
        userId: user.id
      },
      select: {
        id: true
      }
    });

    curatorId = curator.id;

    await setPrimaryReferralLink(tx, curator.id, slug, true);
  });

  revalidateCuratorPages();

  return {
    credentials: {
      email: data.email,
      password,
      referralPath: buildReferralPath(slug)
    },
    curatorId,
    message: "Куратор создан"
  };
}

export type UpdateCuratorState = {
  error?: string;
  success?: boolean;
};

export type BulkDeleteCuratorsState = {
  deletedCount?: number;
  error?: string;
  message?: string;
};

export async function updateCuratorAction(
  _state: UpdateCuratorState,
  formData: FormData
): Promise<UpdateCuratorState> {
  try {
    await requireUser(
      [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      "/admin/curators"
    );
  } catch {
    return { error: "Нет прав для редактирования куратора" };
  }

  const parsed = updateCuratorSchema.safeParse({
    active: formData.get("active") === "on",
    canEditPostPurchase: formData.get("canEditPostPurchase") === "on",
    canEditSupport: formData.get("canEditSupport") === "on",
    canViewClients: formData.get("canViewClients") === "on",
    email: formData.get("email") ?? "",
    hidden: formData.get("hidden") === "on",
    id: formData.get("id"),
    name: formData.get("name"),
    password: formData.get("password") || undefined,
    postPurchaseText: formData.get("postPurchaseText") ?? "",
    postPurchaseTitle: formData.get("postPurchaseTitle") ?? "",
    postPurchaseUrl: formData.get("postPurchaseUrl") ?? "",
    showMailingConsentCheckbox:
      formData.get("showMailingConsentCheckbox") === "on",
    slug: formData.get("slug"),
    supportButtonLabel: formData.get("supportButtonLabel") ?? "",
    supportEnabled: formData.get("supportEnabled") === "on",
    supportUrl: formData.get("supportUrl") ?? "",
    telegramId: formData.get("telegramId") ?? ""
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message;
    return { error: firstError ?? "Проверьте правильность заполненных полей" };
  }

  const data = parsed.data;
  const curator = await prisma.curator.findUnique({
    where: { id: data.id },
    select: {
      isSystem: true,
      slug: true,
      userId: true
    }
  });

  if (!curator) {
    return { error: "Куратор не найден" };
  }

  const slug = curator.isSystem
    ? getSystemCuratorSlug(curator.slug)
    : await createUniqueSlug(data.slug, data.id);

  if (
    data.email &&
    !(await ensureEmailAvailable(data.email, curator.userId ?? undefined))
  ) {
    return { error: "Пользователь с таким email уже существует" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      let userId = curator.userId;

      if (data.email && userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            active: curator.isSystem ? true : data.active,
            email: data.email,
            name: data.name,
            passwordHash: data.password
              ? await hashPassword(data.password)
              : undefined,
            role: curator.isSystem
              ? getSystemCuratorUserRole(curator.slug)
              : undefined
          }
        });
      } else if (data.email && data.password) {
        const user = await tx.user.create({
          data: {
            email: data.email,
            name: data.name,
            passwordHash: await hashPassword(data.password),
            role: curator.isSystem
              ? getSystemCuratorUserRole(curator.slug)
              : UserRole.CURATOR
          },
          select: { id: true }
        });

        userId = user.id;
      }

      await tx.curator.update({
        where: { id: data.id },
        data: {
          active: curator.isSystem ? true : data.active,
          canEditPostPurchase: curator.isSystem
            ? true
            : data.canEditPostPurchase,
          canEditSupport: curator.isSystem ? true : data.canEditSupport,
          canViewClients: curator.isSystem ? true : data.canViewClients,
          hidden: curator.isSystem ? false : data.hidden,
          name: data.name,
          postPurchaseText: data.postPurchaseText,
          postPurchaseTitle: data.postPurchaseTitle,
          postPurchaseUrl: data.postPurchaseUrl,
          showMailingConsentCheckbox: data.showMailingConsentCheckbox,
          slug,
          supportButtonLabel: data.supportButtonLabel,
          supportEnabled: data.supportEnabled,
          supportUrl: data.supportUrl,
          telegramId: data.telegramId,
          userId
        }
      });

      await tx.referralLink.updateMany({
        where: {
          curatorId: data.id
        },
        data: {
          active: curator.isSystem ? true : data.active
        }
      });

      await setPrimaryReferralLink(
        tx,
        data.id,
        slug,
        curator.isSystem ? true : data.active
      );
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сохранения";
    return { error: message };
  }

  revalidateCuratorPages();
  return { success: true };
}

export async function deactivateCuratorAction(formData: FormData) {
  await requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], "/admin/curators");

  const id = String(formData.get("id") ?? "");
  const curator = await prisma.curator.findUnique({
    where: { id },
    select: {
      isSystem: true,
      userId: true
    }
  });

  if (!curator || curator.isSystem) {
    throw new Error("Этого куратора нельзя удалить");
  }

  await prisma.$transaction(async (tx) => {
    await tx.curator.update({
      where: { id },
      data: {
        active: false,
        hidden: true
      }
    });

    await tx.referralLink.updateMany({
      where: {
        curatorId: id
      },
      data: {
        active: false
      }
    });

    if (curator.userId) {
      await tx.user.update({
        where: { id: curator.userId },
        data: { active: false }
      });
    }
  });

  revalidateCuratorPages();
}

export async function bulkDeleteCuratorsAction(
  _state: BulkDeleteCuratorsState,
  formData: FormData
): Promise<BulkDeleteCuratorsState> {
  await requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], "/admin/curators");

  const ids = Array.from(
    new Set(
      formData
        .getAll("ids")
        .map((id) => String(id).trim())
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    return { error: "Выберите хотя бы одного куратора" };
  }

  const curators = await prisma.curator.findMany({
    where: {
      id: { in: ids }
    },
    select: {
      id: true,
      isSystem: true,
      userId: true
    }
  });

  if (curators.length !== ids.length) {
    return { error: "Один или несколько кураторов не найдены" };
  }

  if (curators.some((curator) => curator.isSystem)) {
    return { error: "Системного куратора нельзя удалить" };
  }

  const curatorIds = curators.map((curator) => curator.id);
  const userIds = curators
    .map((curator) => curator.userId)
    .filter((userId): userId is string => Boolean(userId));

  try {
    await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: {
          curatorId: { in: curatorIds }
        },
        select: {
          id: true
        }
      });
      const orderIds = orders.map((order) => order.id);

      if (orderIds.length > 0) {
        await tx.vedicGiftData.deleteMany({
          where: {
            orderId: { in: orderIds }
          }
        });

        await tx.order.deleteMany({
          where: {
            id: { in: orderIds }
          }
        });
      }

      await tx.curator.deleteMany({
        where: {
          id: { in: curatorIds },
          isSystem: false
        }
      });

      if (userIds.length > 0) {
        await tx.user.deleteMany({
          where: {
            id: { in: userIds },
            role: UserRole.CURATOR
          }
        });
      }
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить кураторов";
    return { error: message };
  }

  revalidateCuratorPages();

  return {
    deletedCount: curatorIds.length,
    message:
      curatorIds.length === 1
        ? "Куратор удален полностью"
        : `Кураторы удалены полностью: ${curatorIds.length}`
  };
}

export async function saveCabinetCuratorSettings(formData: FormData) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );
  const parsed = cabinetSettingsSchema.safeParse({
    postPurchaseText: formData.get("postPurchaseText") ?? "",
    postPurchaseTitle: formData.get("postPurchaseTitle") ?? "",
    postPurchaseUrl: formData.get("postPurchaseUrl") ?? "",
    showMailingConsentCheckbox:
      formData.get("showMailingConsentCheckbox") === "on",
    supportButtonLabel: formData.get("supportButtonLabel") ?? "",
    supportUrl: formData.get("supportUrl") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные");
  }

  const curatorId =
    user.role === UserRole.CURATOR
      ? user.curator?.id
      : (await ensureSystemCurator()).id;

  if (!curatorId) {
    throw new Error("Профиль куратора не найден");
  }

  const curator = await prisma.curator.findUnique({
    where: {
      id: curatorId
    },
    select: {
      canEditPostPurchase: true,
      canEditSupport: true
    }
  });

  if (!curator) {
    throw new Error("Профиль куратора не найден");
  }

  const updateData: Prisma.CuratorUpdateInput = {};
  updateData.showMailingConsentCheckbox =
    parsed.data.showMailingConsentCheckbox;

  if (curator.canEditPostPurchase) {
    updateData.postPurchaseText = parsed.data.postPurchaseText;
    updateData.postPurchaseTitle = parsed.data.postPurchaseTitle;
    updateData.postPurchaseUrl = parsed.data.postPurchaseUrl;
  }

  if (curator.canEditSupport) {
    updateData.supportButtonLabel = parsed.data.supportButtonLabel;
    updateData.supportUrl = parsed.data.supportUrl;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("У вас нет прав на изменение этих настроек");
  }

  await prisma.curator.update({
    where: { id: curatorId },
    data: updateData
  });

  revalidateCuratorPages();
}

export async function createCabinetReferralLinkAction(formData: FormData) {
  const curatorId = await requireCabinetCuratorId();
  const approvedPartnerApplication =
    await prisma.curatorPartnerApplication.findFirst({
      where: {
        curatorId,
        status: "APPROVED"
      },
      select: { id: true }
    });

  if (!approvedPartnerApplication) {
    throw new Error("Создание партнёрских ссылок доступно после модерации");
  }

  const parsed = curatorReferralLinkSchema
    .omit({ id: true })
    .safeParse({ title: formData.get("title") });

  if (!parsed.success) {
    throw new Error("Укажите название ссылки от 2 до 120 символов");
  }

  let slug = "";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    slug = slugify(`ref-${crypto.randomBytes(4).toString("hex")}`);
    const existing = await prisma.referralLink.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!existing) {
      break;
    }

    slug = "";
  }

  if (!slug) {
    throw new Error("Не удалось сгенерировать ссылку");
  }

  await prisma.referralLink.create({
    data: {
      active: true,
      createdByCurator: true,
      curatorId,
      isPrimary: false,
      slug,
      title: parsed.data.title
    }
  });

  revalidateCuratorPages();
}

export async function updateCabinetReferralLinkAction(formData: FormData) {
  const curatorId = await requireCabinetCuratorId();
  const parsed = curatorReferralLinkSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title")
  });

  if (!parsed.success || !parsed.data.id) {
    throw new Error("Некорректные данные ссылки");
  }

  await prisma.referralLink.updateMany({
    where: {
      curatorId,
      id: parsed.data.id,
      isPrimary: false
    },
    data: {
      title: parsed.data.title
    }
  });

  revalidateCuratorPages();
}

export async function toggleCabinetReferralLinkAction(formData: FormData) {
  const curatorId = await requireCabinetCuratorId();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";

  if (!id) {
    throw new Error("Ссылка не найдена");
  }

  await prisma.referralLink.updateMany({
    where: {
      curatorId,
      id,
      isPrimary: false
    },
    data: {
      active
    }
  });

  revalidateCuratorPages();
}
