import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { slugifyReferralValue } from "@/lib/slugs";
import { prisma } from "@/lib/prisma";
import {
  adminCuratorSlug,
  buildReferralPath,
  buildReferralUrl,
  chintamaniAdminCuratorSlug,
  ensureChintamaniSystemCurator,
  ensureSystemCurator
} from "@/server/referrals";

export const adminCuratorSelect = {
  active: true,
  canEditPostPurchase: true,
  canEditSupport: true,
  canViewClients: true,
  hidden: true,
  id: true,
  isSystem: true,
  name: true,
  orders: {
    select: {
      amountRub: true,
      clientId: true,
      customerEmail: true,
      customerPhone: true,
      customerTelegram: true,
      id: true,
      status: true
    }
  },
  postPurchaseText: true,
  postPurchaseTitle: true,
  postPurchaseUrl: true,
  showMailingConsentCheckbox: true,
  referralLinks: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      active: true,
      id: true,
      isPrimary: true,
      slug: true
    }
  },
  slug: true,
  supportButtonLabel: true,
  supportEnabled: true,
  supportUrl: true,
  telegramId: true,
  user: {
    select: {
      active: true,
      email: true
    }
  }
} satisfies Prisma.CuratorSelect;

export type AdminCurator = Prisma.CuratorGetPayload<{
  select: typeof adminCuratorSelect;
}>;

type OrderIdentity = Pick<
  AdminCurator["orders"][number],
  "clientId" | "customerEmail" | "customerPhone" | "customerTelegram" | "id"
>;

export async function getAdminOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (host ? `${protocol}://${host}` : "")
  );
}

async function createUniqueLatinReferralSlug(value: string, currentId: string) {
  const base =
    slugifyReferralValue(value) ||
    `curator-${currentId.slice(0, 8).toLocaleLowerCase("en")}`;
  let slug = base;
  let index = 2;

  while (true) {
    const [curator, referralLink] = await Promise.all([
      prisma.curator.findFirst({
        where: {
          id: { not: currentId },
          slug
        },
        select: { id: true }
      }),
      prisma.referralLink.findFirst({
        where: {
          curatorId: { not: currentId },
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

async function normalizeCuratorReferralSlugs() {
  const curators = await prisma.curator.findMany({
    select: {
      id: true,
      isSystem: true,
      name: true,
      referralLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          isPrimary: true,
          slug: true
        }
      },
      slug: true
    }
  });

  for (const curator of curators) {
    const primarySlug =
      curator.referralLinks.find((link) => link.isPrimary)?.slug ??
      curator.slug;
    const normalizedSlug = curator.isSystem
      ? curator.slug === chintamaniAdminCuratorSlug
        ? chintamaniAdminCuratorSlug
        : adminCuratorSlug
      : await createUniqueLatinReferralSlug(
          primarySlug || curator.slug || curator.name,
          curator.id
        );

    if (normalizedSlug === primarySlug && normalizedSlug === curator.slug) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.curator.update({
        where: { id: curator.id },
        data: {
          slug: normalizedSlug
        }
      });

      await tx.referralLink.updateMany({
        where: {
          curatorId: curator.id,
          slug: { not: normalizedSlug }
        },
        data: {
          isPrimary: false
        }
      });

      const existingLink = await tx.referralLink.findUnique({
        where: { slug: normalizedSlug },
        select: { curatorId: true, id: true }
      });

      if (existingLink?.curatorId === curator.id) {
        await tx.referralLink.update({
          where: { id: existingLink.id },
          data: {
            active: true,
            isPrimary: true
          }
        });
        return;
      }

      if (!existingLink) {
        await tx.referralLink.create({
          data: {
            active: true,
            curatorId: curator.id,
            isPrimary: true,
            slug: normalizedSlug
          }
        });
      }
    });
  }
}

export async function getAdminCurators() {
  await Promise.all([ensureSystemCurator(), ensureChintamaniSystemCurator()]);
  await normalizeCuratorReferralSlugs();

  return prisma.curator.findMany({
    orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: adminCuratorSelect
  });
}

export async function getAdminCurator(id: string) {
  await Promise.all([ensureSystemCurator(), ensureChintamaniSystemCurator()]);
  await normalizeCuratorReferralSlugs();

  return prisma.curator.findUnique({
    where: { id },
    select: adminCuratorSelect
  });
}

export function getClientCount(orders: OrderIdentity[]) {
  return new Set(
    orders.map(
      (order) =>
        order.clientId ??
        order.customerEmail ??
        order.customerPhone ??
        order.customerTelegram ??
        order.id
    )
  ).size;
}

export function getPaidAmount(curator: AdminCurator) {
  return curator.orders
    .filter((order) => order.status === "PAID")
    .reduce((total, order) => total + order.amountRub, 0);
}

export function getPrimaryReferralSlug(curator: AdminCurator) {
  return (
    curator.referralLinks.find((link) => link.isPrimary)?.slug ?? curator.slug
  );
}

export function getReferralForCurator(curator: AdminCurator, origin: string) {
  const primaryReferralSlug = getPrimaryReferralSlug(curator);

  return origin
    ? buildReferralUrl(origin, primaryReferralSlug)
    : buildReferralPath(primaryReferralSlug);
}

export function getCuratorStatusLabel(curator: AdminCurator) {
  if (curator.isSystem) {
    return "Системный";
  }

  if (!curator.active) {
    return "Отключен";
  }

  if (curator.hidden) {
    return "Скрыт";
  }

  return "Активен";
}

export function getCuratorStatusClassName(curator: AdminCurator) {
  if (curator.isSystem) {
    return "badge badge--muted";
  }

  if (!curator.active) {
    return "badge badge--danger";
  }

  if (curator.hidden) {
    return "badge badge--warning";
  }

  return "badge badge--success";
}
