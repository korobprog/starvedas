import { OrderStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatStatus } from "@/lib/status-labels";
import { requireUser } from "@/server/auth";
import { ensureSystemCurator } from "@/server/referrals";

export const dynamic = "force-dynamic";

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");

  if (!/[",\n;]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function formatContacts(order: {
  customerEmail: string | null;
  customerPhone: string | null;
  customerTelegram: string | null;
}) {
  return [order.customerTelegram, order.customerPhone, order.customerEmail]
    .filter(Boolean)
    .join(", ");
}

function getReferralLabel(link: {
  isPrimary: boolean;
  title: string | null;
  slug: string;
}) {
  return link.title?.trim() || (link.isPrimary ? "Основная ссылка" : link.slug);
}

export async function GET(request: Request) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );
  const curatorId =
    user.role === UserRole.CURATOR
      ? user.curator?.id
      : (await ensureSystemCurator()).id;

  if (!curatorId) {
    return NextResponse.json({ message: "Кабинет не найден" }, { status: 404 });
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug")?.trim() || undefined;
  const referralLinks = await prisma.referralLink.findMany({
    select: {
      isPrimary: true,
      slug: true,
      title: true
    },
    where: {
      curatorId,
      slug: slug || undefined
    }
  });
  const labels = new Map(
    referralLinks.map((link) => [link.slug, getReferralLabel(link)])
  );
  const orders = await prisma.order.findMany({
    orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
    select: {
      amountRub: true,
      createdAt: true,
      currency: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      orderNumber: true,
      payment: {
        select: {
          status: true
        }
      },
      referralSlug: true,
      service: {
        select: {
          title: true
        }
      },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: {
          titleSnapshot: true
        }
      },
      status: true
    },
    where: {
      curatorId,
      deletedAt: null,
      referralSlug: slug || undefined,
      status: {
        in: [OrderStatus.PAID, OrderStatus.REFUNDED]
      }
    }
  });
  const header = [
    "Дата",
    "Заказ",
    "Клиент",
    "Контакты",
    "Источник",
    "Реферальный код",
    "Покупка",
    "Статус заказа",
    "Статус оплаты",
    "Сумма",
    "Валюта",
    "Сумма для итога"
  ];
  const body = orders.map((order) => {
    const sourceLabel = order.referralSlug
      ? labels.get(order.referralSlug) || order.referralSlug
      : "Без ссылки";
    const netAmount =
      order.status === OrderStatus.REFUNDED
        ? -order.amountRub
        : order.amountRub;
    const serviceTitle = [
      order.service.title,
      ...order.serviceOptions.map((option) => option.titleSnapshot)
    ].join(" / ");

    return [
      order.createdAt.toLocaleDateString("ru-RU"),
      `#${order.orderNumber}`,
      order.customerName,
      formatContacts(order),
      sourceLabel,
      order.referralSlug ?? "",
      serviceTitle,
      formatStatus(order.status),
      order.payment?.status ? formatStatus(order.payment.status) : "",
      order.amountRub,
      order.currency,
      netAmount
    ];
  });
  const csv = [header, ...body]
    .map((line) => line.map(escapeCsv).join(";"))
    .join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Disposition": `attachment; filename="referral-${slug || "all"}.csv"`,
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
