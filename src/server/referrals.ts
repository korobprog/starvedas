import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const adminCuratorSlug = "administrator";
export const referralCookieName = "starvedas_ref_curator";
export const referralCookieMaxAge = 60 * 60 * 24 * 90;
export const defaultReferralOrigin = "https://chintamanidhama.ru";

export type PublicCuratorAssignment = {
  id: string;
  name: string;
  postPurchaseText: string | null;
  postPurchaseTitle: string | null;
  postPurchaseUrl: string | null;
  showMailingConsentCheckbox: boolean;
  slug: string;
  supportButtonLabel: string | null;
  supportEnabled: boolean;
  supportUrl: string | null;
};

const publicCuratorSelect = {
  id: true,
  name: true,
  postPurchaseText: true,
  postPurchaseTitle: true,
  postPurchaseUrl: true,
  showMailingConsentCheckbox: true,
  slug: true,
  supportButtonLabel: true,
  supportEnabled: true,
  supportUrl: true
} as const;

function decodeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function normalizeSlug(slug: string | undefined) {
  return slug
    ? decodeSlug(slug)
        .normalize("NFC")
        .trim()
        .toLocaleLowerCase("ru")
        .replaceAll("ё", "е")
        .replace(/[^a-zа-я0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";
}

export function normalizeReferralSlug(slug: string | undefined) {
  return normalizeSlug(slug);
}

async function ensurePrimaryReferralLink(curatorId: string, slug: string) {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.referralLink.updateMany({
      where: {
        curatorId,
        isPrimary: true,
        slug: {
          not: normalizedSlug
        }
      },
      data: {
        isPrimary: false
      }
    });

    const existingLink = await tx.referralLink.findUnique({
      where: {
        slug: normalizedSlug
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
          active: true,
          isPrimary: true
        }
      });
      return;
    }

    await tx.referralLink.create({
      data: {
        active: true,
        curatorId,
        isPrimary: true,
        slug: normalizedSlug
      }
    });
  });
}

export async function ensureSystemCurator() {
  const curator = await prisma.curator.upsert({
    where: { slug: adminCuratorSlug },
    create: {
      active: true,
      canEditPostPurchase: true,
      canEditSupport: true,
      canViewClients: true,
      hidden: false,
      isSystem: true,
      name: "Администратор",
      postPurchaseText:
        "Спасибо за оплату. Администратор свяжется с вами и передаст дальнейшую информацию.",
      supportButtonLabel: "Написать вопрос администратору",
      supportEnabled: true,
      supportUrl: "https://t.me/art_om108",
      slug: adminCuratorSlug,
      sortOrder: 0
    },
    update: {
      active: true,
      canEditPostPurchase: true,
      canEditSupport: true,
      canViewClients: true,
      hidden: false,
      isSystem: true
    },
    select: publicCuratorSelect
  });

  await ensurePrimaryReferralLink(curator.id, adminCuratorSlug);

  return curator;
}

export async function findActiveCuratorBySlug(slug: string) {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  return prisma.curator.findFirst({
    where: {
      active: true,
      hidden: false,
      slug: normalizedSlug
    },
    select: publicCuratorSelect
  });
}

export async function findActiveCuratorByReferralSlug(slug: string) {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  const referralLink = await prisma.referralLink.findFirst({
    where: {
      active: true,
      slug: normalizedSlug,
      curator: {
        active: true,
        hidden: false
      }
    },
    select: {
      curator: {
        select: publicCuratorSelect
      }
    }
  });

  return referralLink?.curator ?? null;
}

export async function getCuratorForReferral(referralSlug?: string | null) {
  const curator = referralSlug
    ? await findActiveCuratorByReferralSlug(referralSlug)
    : null;

  return curator ?? ensureSystemCurator();
}

export async function getAssignedCuratorFromCookie() {
  const cookieStore = await cookies();
  const slug = cookieStore.get(referralCookieName)?.value;
  const curator = await findActiveCuratorByReferralSlug(slug ?? "");

  return curator ?? ensureSystemCurator();
}

export function buildReferralPath(slug: string) {
  return `/r/${encodeURIComponent(slug)}`;
}

export function getReferralPublicOrigin(origin?: string) {
  const chintamaniOrigin =
    process.env.NEXT_PUBLIC_CHINTAMANI_SITE_URL?.trim().replace(/\/$/, "") ||
    defaultReferralOrigin;
  const configuredReferralOrigin =
    process.env.NEXT_PUBLIC_REFERRAL_SITE_URL?.trim().replace(/\/$/, "");

  return (
    chintamaniOrigin ||
    configuredReferralOrigin ||
    origin?.replace(/\/$/, "") ||
    ""
  );
}

export function buildReferralUrl(origin: string, slug: string) {
  const referralOrigin = getReferralPublicOrigin(origin);

  return `${referralOrigin}${buildReferralPath(slug)}`;
}
