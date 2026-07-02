import { LeadStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatChildRecordLines } from "@/lib/shraddha";
import { markOrderClientBought } from "@/server/client-profiles";
import { sendPaymentStatusEmail } from "@/server/email/order-emails";
import {
  captureOrderRevision,
  orderRevisionEventTypes
} from "@/server/order-revisions";
import { type PayformData, verifyPayformSignature } from "@/server/payform";
import { sendPaymentSucceededTelegramNotification } from "@/server/telegram-notifications";

type ParsedPaymentPayload = {
  rawBody: string;
  payload: Record<string, unknown>;
};

function parseMaybeJson(value: string) {
  const trimmed = value.trim();

  if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function parseFormKey(key: string) {
  const [root] = key.split("[");
  const path = root ? [root] : [];
  const matcher = /\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(key))) {
    path.push(match[1] ?? "");
  }

  return path.length ? path : [key];
}

function assignPayloadValue(
  payload: Record<string, unknown>,
  key: string,
  value: unknown
) {
  const path = parseFormKey(key);
  let current: Record<string, unknown> | unknown[] = payload;

  for (const [index, rawPart] of path.entries()) {
    const isLast = index === path.length - 1;
    const nextPart = path[index + 1];
    const part =
      rawPart || (Array.isArray(current) ? String(current.length) : rawPart);

    if (isLast) {
      const existing = current[part as keyof typeof current];

      if (existing === undefined) {
        current[part as keyof typeof current] = value as never;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        current[part as keyof typeof current] = [existing, value] as never;
      }
      return;
    }

    const existing = current[part as keyof typeof current];

    if (!existing || typeof existing !== "object") {
      current[part as keyof typeof current] = /^\d+$/.test(nextPart ?? "")
        ? ([] as never)
        : ({} as never);
    }

    current = current[part as keyof typeof current] as
      | Record<string, unknown>
      | unknown[];
  }
}

function parseUrlEncodedPayload(body: string) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of new URLSearchParams(body).entries()) {
    assignPayloadValue(payload, key, parseMaybeJson(value));
  }

  return payload;
}

async function parseFormDataPayload(formData: FormData) {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      assignPayloadValue(payload, key, parseMaybeJson(value));
      continue;
    }

    assignPayloadValue(payload, key, parseMaybeJson(await value.text()));
  }

  return payload;
}

async function parsePaymentPayload(
  request: Request
): Promise<ParsedPaymentPayload> {
  const contentType = request.headers.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
    return {
      rawBody: "",
      payload: await parseFormDataPayload(await request.formData())
    };
  }

  const body = await request.text();

  if (contentType?.includes("application/json")) {
    return {
      rawBody: body,
      payload: JSON.parse(body) as Record<string, unknown>
    };
  }

  return {
    rawBody: body,
    payload: parseUrlEncodedPayload(body)
  };
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
    "order_num",
    "orderNumber",
    "order_number",
    "order_id",
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
    "receiptLink",
    "receipt_link",
    "check_url",
    "checkUrl",
    "fiscal_check_url",
    "fiscal_receipt_url",
    "fiscalReceiptUrl",
    "ofd_url",
    "ofd_receipt_url",
    "ofdReceiptUrl",
    "payment_receipt_url",
    "paymentReceiptUrl",
    "receipt"
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

  if (
    status &&
    ["fail", "failed", "error", "declined", "denied", "order_denied"].includes(
      status
    )
  ) {
    return PaymentStatus.FAILED;
  }

  if (
    status &&
    ["cancel", "cancelled", "canceled", "order_canceled"].includes(status)
  ) {
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

function parseWebhookAmountKopeks(payload: Record<string, unknown>) {
  const value = getString(payload, ["sum", "amount", "amountRub"]);

  if (!value) {
    return undefined;
  }

  const normalizedValue = value.replace(/\s+/g, "").replace(",", ".");
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
}

function canIgnoreStatusChange({
  currentStatus,
  nextStatus
}: {
  currentStatus: PaymentStatus | undefined;
  nextStatus: PaymentStatus;
}) {
  return (
    currentStatus === PaymentStatus.SUCCEEDED &&
    nextStatus !== PaymentStatus.SUCCEEDED &&
    nextStatus !== PaymentStatus.REFUNDED
  );
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
  let parsedPayload: ParsedPaymentPayload;

  try {
    parsedPayload = await parsePaymentPayload(request);
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { payload, rawBody } = parsedPayload;

  const signature =
    request.headers.get("sign") ??
    request.headers.get("x-payform-signature") ??
    request.headers.get("x-prodamus-signature") ??
    request.headers.get("x-signature") ??
    getString(payload, ["sign", "signature"]) ??
    null;

  if (
    !secret ||
    !verifyPayformSignature(rawBody, signature, secret, payload as PayformData)
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
    "order_id",
    "payment_id",
    "transaction_id",
    "id"
  ]);
  const receiptUrl = getSafeReceiptUrl(payload);
  const receiptLabel = receiptUrl
    ? (getString(payload, ["receipt_label", "receiptLabel", "check_label"]) ??
      "Открыть чек")
    : undefined;

  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
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
      childRecords: {
        orderBy: {
          sortOrder: "asc"
        },
        select: {
          childCount: true,
          parentName: true,
          type: true
        }
      },
      payment: {
        select: {
          receiptLabel: true,
          receiptUrl: true,
          status: true
        }
      },
      service: {
        select: {
          shraddhaDeceasedChildLabel: true,
          shraddhaUnbornLabel: true,
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

  const webhookAmountKopeks = parseWebhookAmountKopeks(payload);
  const expectedAmountKopeks = order.amountRub * 100;

  if (webhookAmountKopeks === undefined) {
    return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
  }

  if (webhookAmountKopeks !== expectedAmountKopeks) {
    console.error("Payment webhook amount mismatch", {
      expectedAmountRub: order.amountRub,
      orderNumber,
      providerName,
      webhookAmountRub: webhookAmountKopeks / 100
    });

    return NextResponse.json({ message: "Amount mismatch" }, { status: 409 });
  }

  if (
    canIgnoreStatusChange({
      currentStatus: order.payment?.status,
      nextStatus: paymentStatus
    })
  ) {
    return NextResponse.json({ ignored: true, ok: true });
  }

  if (order.payment?.status === paymentStatus) {
    if (receiptUrl && order.payment.receiptUrl !== receiptUrl) {
      await prisma.payment.update({
        where: {
          orderId: order.id
        },
        data: {
          rawPayload: payload as Prisma.InputJsonObject,
          receiptLabel,
          receiptUploadedAt: new Date(),
          receiptUrl
        }
      });
    }

    return NextResponse.json({ duplicate: true, ok: true });
  }

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      eventType: orderRevisionEventTypes.paymentWebhook,
      note: `Webhook ${providerName} изменил статус оплаты`,
      orderId: order.id
    });

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
        childRecordLines: formatChildRecordLines(order.childRecords, {
          unbornLabel: order.service.shraddhaUnbornLabel ?? undefined,
          deceasedChildLabel:
            order.service.shraddhaDeceasedChildLabel ?? undefined
        }),
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
        receiptLabel,
        receiptUrl,
        selectedOptions: order.serviceOptions.map((option) => ({
          priceRub: option.totalRubSnapshot,
          title: option.titleSnapshot
        })),
        serviceTitle: order.service.title,
        sourceDomain: order.sourceDomain,
        statusText: "оплачен"
      });
    } catch (error) {
      console.error("Telegram payment notification failed", error);
    }
  }

  try {
    await sendPaymentStatusEmail(order.id, paymentStatus);
  } catch (error) {
    console.error("Payment status email failed", error);
  }

  return NextResponse.json({ ok: true });
}
