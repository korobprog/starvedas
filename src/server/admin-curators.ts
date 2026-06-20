import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildReferralPath,
  buildReferralUrl,
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

export async function getAdminCurators() {
  await ensureSystemCurator();

  return prisma.curator.findMany({
    orderBy: [{ isSystem: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: adminCuratorSelect
  });
}

export async function getAdminCurator(id: string) {
  await ensureSystemCurator();

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

export function getOldReferralLinks(curator: AdminCurator) {
  return curator.referralLinks.filter((link) => !link.isPrimary);
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
