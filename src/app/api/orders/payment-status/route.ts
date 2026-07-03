import { OrderStatus, PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicToken = url.searchParams.get("order")?.trim();

  if (!publicToken) {
    return NextResponse.json(
      { message: "Order token is required" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
      publicToken
    },
    select: {
      payment: {
        select: {
          status: true
        }
      },
      publicToken: true,
      status: true
    }
  });

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const paymentStatus = order.payment?.status ?? null;
  const confirmed =
    order.status === OrderStatus.PAID &&
    paymentStatus === PaymentStatus.SUCCEEDED;
  const failed =
    order.status === OrderStatus.FAILED ||
    order.status === OrderStatus.CANCELLED ||
    paymentStatus === PaymentStatus.FAILED ||
    paymentStatus === PaymentStatus.CANCELLED;

  return NextResponse.json(
    {
      clientOrderPath: `/client/orders/${encodeURIComponent(order.publicToken)}`,
      confirmed,
      failed,
      orderStatus: order.status,
      paymentStatus
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
