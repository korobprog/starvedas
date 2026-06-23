import { LeadStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { markOrderClientBought } from "@/server/client-profiles";
import { sendPaymentStatusEmail } from "@/server/email/order-emails";
import { type PayformData, verifyPayformSignature } from "@/server/payform";
import { sendPaymentSucceededTelegramNotification } from "@/server/telegram-notifications";

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

function getSafeReceiptUrl(payload: Record<string, unknown>) {
  const value = getString(payload, [
    "receipt_url",
    "receiptUrl",
    "check_url",
    "fiscal_receipt_url",
    "ofd_url",
    "receipt",
    "receipt_link"
  ]);

  if (!value?.startsWith("https://") && !value?.startsWith("http://")) {
    return undefined;
  }

  return value;
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
  const paidAt = paymentStatus === PaymentStatus.SUCCEEDED ? new Date() : null;
  const providerPaymentId = getString(payload, [
    "payment_id",
    "transaction_id",
    "id"
  ]);
  const receiptUrl = getSafeReceiptUrl(payload);
  const receiptLabel = receiptUrl
    ? (getString(payload, ["receipt_label", "receiptLabel", "check_label"]) ??
      "Открыть чек")
    : undefined;

  const order = await prisma.order.findUnique({
    where: {
      orderNumber
    },
    select: {
      amountRub: true,
      curator: {
        select: {
          name: true
        }
      },
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      customerTelegram: true,
      id: true,
      leadStatus: true,
      orderNumber: true,
      participantCount: true,
      participants: {
        orderBy: {
          sortOrder: "asc"
        },
        select: {
          fullName: true
        }
      },
      payment: {
        select: {
          status: true
        }
      },
      service: {
        select: {
          title: true
        }
      },
      serviceOptions: {
        orderBy: {
          sortOrder: "asc"
        },
        select: {
          titleSnapshot: true,
          totalRubSnapshot: true
        }
      },
      sourceDomain: true,
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
        paidAt: paidAt ?? undefined,
        providerPaymentId,
        rawPayload: payload as Prisma.InputJsonObject,
        receiptLabel,
        receiptUploadedAt: receiptUrl ? new Date() : undefined,
        receiptUrl,
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

  if (paymentStatus === PaymentStatus.SUCCEEDED) {
    try {
      await sendPaymentSucceededTelegramNotification({
        amountRub: order.amountRub,
        curatorName: order.curator.name,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerTelegram: order.customerTelegram,
        orderNumber: order.orderNumber,
        paidAt,
        participantCount: order.participantCount,
        participantNames: order.participants.map(
          (participant) => participant.fullName
        ),
        paymentProviderName: providerName,
        selectedOptions: order.serviceOptions.map((option) => ({
          priceRub: option.totalRubSnapshot,
          title: option.titleSnapshot
        })),
        serviceTitle: order.service.title,
        sourceDomain: order.sourceDomain,
        statusText: "оплачен"
      });
    } catch {
      console.error("Telegram payment notification failed");
    }
  }

  try {
    await sendPaymentStatusEmail(order.id, paymentStatus);
  } catch {
    console.error("Payment status email failed");
  }

  return NextResponse.json({ ok: true });
}
