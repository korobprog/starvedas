import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentClientProfile } from "@/server/client-auth";

export async function GET(request: Request) {
  const client = await getCurrentClientProfile();

  if (!client) {
    return NextResponse.json(
      { message: "Нужен вход через Telegram" },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const publicToken = url.searchParams.get("order")?.trim();

  if (!publicToken) {
    return NextResponse.json({ message: "Заказ не найден" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: {
      clientId: client.id,
      deletedAt: null,
      publicToken
    },
    select: {
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      participantsText: true,
      referralSlug: true,
      service: {
        select: {
          slug: true
        }
      },
      serviceOptions: {
        orderBy: { sortOrder: "asc" },
        select: {
          optionId: true
        }
      }
    }
  });

  if (!order) {
    return NextResponse.json({ message: "Заказ не найден" }, { status: 404 });
  }

  return NextResponse.json({
    customerEmail: client.email ?? order.customerEmail,
    customerName: client.name || order.customerName,
    customerPhone: client.phone ?? order.customerPhone,
    customerTelegram: client.telegram ?? order.customerTelegram,
    participantsText: order.participantsText,
    referralSlug: order.referralSlug ?? client.referralSlug,
    selectedServiceOptionIds: order.serviceOptions
      .map((option) => option.optionId)
      .filter((optionId): optionId is string => Boolean(optionId)),
    serviceSlug: order.service.slug
  });
}
