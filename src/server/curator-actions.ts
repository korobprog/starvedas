"use server";

import crypto from "node:crypto";
import { Prisma, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { hashPassword } from "@/server/password";
import {
  adminCuratorSlug,
  buildReferralPath,
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
  supportUrl: optionalSupportUrl
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
  supportUrl: optionalSupportUrl
});

const cabinetSettingsSchema = z.object({
  postPurchaseText: optionalText,
  postPurchaseTitle: optionalText,
  postPurchaseUrl: optionalUrl,
  showMailingConsentCheckbox: z.boolean(),
  supportButtonLabel: optionalButtonLabel,
  supportUrl: optionalSupportUrl
});

function slugify(value: string) {
  const slug = value
    .toLocaleLowerCase("ru")
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `curator-${crypto.randomBytes(4).toString("hex")}`;
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
    supportUrl: formData.get("supportUrl") ?? ""
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
        userId: user.id
      },
      select: {
        id: true
      }
    });

    await setPrimaryReferralLink(tx, curator.id, slug, true);
  });

  revalidateCuratorPages();

  return {
    credentials: {
      email: data.email,
      password,
      referralPath: buildReferralPath(slug)
    },
    message: "Куратор создан"
  };
}

export async function updateCuratorAction(formData: FormData) {
  await requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], "/admin/curators");

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
    supportUrl: formData.get("supportUrl") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные куратора");
  }

  const data = parsed.data;
  const curator = await prisma.curator.findUnique({
    where: { id: data.id },
    select: {
      isSystem: true,
      userId: true
    }
  });

  if (!curator) {
    throw new Error("Куратор не найден");
  }

  const slug =
    curator.isSystem && data.slug !== adminCuratorSlug
      ? adminCuratorSlug
      : await createUniqueSlug(data.slug, data.id);

  if (
    data.email &&
    !(await ensureEmailAvailable(data.email, curator.userId ?? undefined))
  ) {
    throw new Error("Пользователь с таким email уже существует");
  }

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
          role: curator.isSystem ? UserRole.SUPER_ADMIN : undefined
        }
      });
    } else if (data.email && data.password) {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          passwordHash: await hashPassword(data.password),
          role: curator.isSystem ? UserRole.SUPER_ADMIN : UserRole.CURATOR
        },
        select: { id: true }
      });

      userId = user.id;
    }

    await tx.curator.update({
      where: { id: data.id },
      data: {
        active: curator.isSystem ? true : data.active,
        canEditPostPurchase: curator.isSystem ? true : data.canEditPostPurchase,
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

  revalidateCuratorPages();
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
