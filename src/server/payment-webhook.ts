import { LeadStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderClientBought } from "@/server/client-profiles";
import { type PayformData, verifyPayformSignature } from "@/server/payform";

function parseFormBody(body: string) {
  return Object.fromEntries(new URLSearchParams(body));
}

function parsePayload(body: string, contentType: string | null) {
  if (contentType?.includes("application/json")) {
    return JSON.parse(body) as Record<string, unknown>;
  }

  return parseFormBody(body);
}

function getString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function getOrderNumber(payload: Record<string, unknown>) {
  const value = getString(payload, [
    "order_id",
    "orderNumber",
    "order_number",
    "invoice_id",
    "providerPaymentId"
  ]);

  const orderNumber = Number(value);

  return Number.isInteger(orderNumber) ? orderNumber : undefined;
}

function getPaymentStatus(payload: Record<string, unknown>) {
  const status = getString(payload, [
    "payment_status",
    "status",
    "transaction_status"
  ])?.toLowerCase();

  if (
    status &&
    ["success", "succeeded", "paid", "completed", "done"].includes(status)
  ) {
    return PaymentStatus.SUCCEEDED;
  }

  if (status && ["fail", "failed", "error", "declined"].includes(status)) {
    return PaymentStatus.FAILED;
  }

  if (status && ["cancel", "cancelled", "canceled"].includes(status)) {
    return PaymentStatus.CANCELLED;
  }

  if (status && ["refund", "refunded"].includes(status)) {
    return PaymentStatus.REFUNDED;
  }

  if (
    status &&
    [
      "awaiting_verification",
      "manual_review",
      "payment_review",
      "review"
    ].includes(status)
  ) {
    return PaymentStatus.AWAITING_VERIFICATION;
  }

  return PaymentStatus.PENDING;
}

function toOrderStatus(status: PaymentStatus) {
  if (status === PaymentStatus.SUCCEEDED) {
    return OrderStatus.PAID;
  }

  if (status === PaymentStatus.FAILED) {
    return OrderStatus.FAILED;
  }

  if (status === PaymentStatus.CANCELLED) {
    return OrderStatus.CANCELLED;
  }

  if (status === PaymentStatus.REFUNDED) {
    return OrderStatus.REFUNDED;
  }

  if (status === PaymentStatus.AWAITING_VERIFICATION) {
    return OrderStatus.WAITING_PAYMENT_VERIFICATION;
  }

  return OrderStatus.PENDING_PAYMENT;
}

function toLeadStatus(status: PaymentStatus) {
  if (status === PaymentStatus.SUCCEEDED) {
    return LeadStatus.PAID;
  }

  if (
    status === PaymentStatus.FAILED ||
    status === PaymentStatus.CANCELLED ||
    status === PaymentStatus.REFUNDED
  ) {
    return LeadStatus.CANCELLED;
  }

  if (status === PaymentStatus.AWAITING_VERIFICATION) {
    return LeadStatus.WAITING_PAYMENT_VERIFICATION;
  }

  return LeadStatus.WAITING_PAYMENT;
}

export async function handlePaymentWebhook({
  providerName,
  request,
  secret
}: {
  providerName: string;
  request: Request;
  secret: string | undefined;
}) {
  const body = await request.text();
  let payload: Record<string, unknown>;

  try {
    payload = parsePayload(body, request.headers.get("content-type"));
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const signature =
    request.headers.get("sign") ??
    request.headers.get("x-payform-signature") ??
    request.headers.get("x-prodamus-signature") ??
    request.headers.get("x-signature") ??
    getString(payload, ["sign", "signature"]) ??
    null;

  if (
    !secret ||
    !verifyPayformSignature(body, signature, secret, payload as PayformData)
  ) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const orderNumber = getOrderNumber(payload);

  if (!orderNumber) {
    return NextResponse.json({ message: "Order not found" }, { status: 400 });
  }

  const paymentStatus = getPaymentStatus(payload);
  const orderStatus = toOrderStatus(paymentStatus);
  const leadStatus = toLeadStatus(paymentStatus);
  const providerPaymentId = getString(payload, [
    "payment_id",
    "transaction_id",
    "id"
  ]);

  const order = await prisma.order.findUnique({
    where: {
      orderNumber
    },
    select: {
      id: true,
      leadStatus: true,
      payment: {
        select: {
          status: true
        }
      },
      status: true
    }
  });

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  if (order.payment?.status === paymentStatus) {
    return NextResponse.json({ duplicate: true, ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: {
        orderId: order.id
      },
      data: {
        paidAt:
          paymentStatus === PaymentStatus.SUCCEEDED ? new Date() : undefined,
        providerPaymentId,
        rawPayload: payload as Prisma.InputJsonObject,
        status: paymentStatus
      }
    });

    await tx.order.update({
      where: {
        id: order.id
      },
      data: {
        leadStatus,
        status: orderStatus
      }
    });

    if (order.leadStatus !== leadStatus) {
      await tx.leadStatusHistory.create({
        data: {
          fromStatus: order.leadStatus,
          note: `Статус обновлен через ${providerName} webhook`,
          orderId: order.id,
          toStatus: leadStatus
        }
      });
    }

    if (paymentStatus === PaymentStatus.SUCCEEDED) {
      await markOrderClientBought(tx, order.id, providerName);
    }
  });

  return NextResponse.json({ ok: true });
}
