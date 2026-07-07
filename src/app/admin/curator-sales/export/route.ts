import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { formatStatus } from "@/lib/status-labels";
import { getCuratorSalesReport } from "@/server/curator-sales-report";
import { requireUser } from "@/server/auth";

export const dynamic = "force-dynamic";

function escapeCsv(value: string | number | null | undefined) {
  const text = String(value ?? "");

  if (!/[",\n;]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ru-RU");
}

export async function GET(request: Request) {
  await requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], "/admin/curator-sales");

  const url = new URL(request.url);
  const report = await getCuratorSalesReport(url.searchParams);
  const header = [
    "Дата",
    "Заказ",
    "Куратор",
    "Партнер / источник",
    "Код ссылки",
    "Продукт",
    "Мероприятие",
    "ФИО клиента",
    "Сумма",
    "Валюта",
    "Email",
    "Телефон",
    "Telegram",
    "Статус заказа",
    "Статус оплаты"
  ];
  const body = report.rows.map((row) => [
    formatDate(row.saleDate),
    `#${row.orderNumber}`,
    row.curatorName,
    row.partnerLabel,
    row.referralSlug,
    row.serviceTitle,
    row.serviceOptionsLabel,
    row.customerName,
    row.amountRub,
    row.currency,
    row.customerEmail,
    row.customerPhone,
    row.customerTelegram,
    formatStatus(row.orderStatus),
    row.paymentStatus ? formatStatus(row.paymentStatus) : ""
  ]);
  const csv = [header, ...body]
    .map((line) => line.map(escapeCsv).join(";"))
    .join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": "attachment; filename=\"curator-sales.csv\"",
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
