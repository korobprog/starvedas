import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/email/mailer";
import {
  buildOrderCreatedEmail,
  buildPaymentFailedEmail,
  buildPaymentSucceededEmail,
  buildReceiptEmail,
  type EmailTemplate,
  type OrderEmailData
} from "@/server/email/templates";
import { getSiteUrlForSourceDomain } from "@/server/email/site-url";

function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();

  return trimmed || null;
}

function toOrderEmailData(
  order: NonNullable<Awaited<ReturnType<typeof getOrderForEmail>>>
): OrderEmailData {
  const siteUrl = getSiteUrlForSourceDomain(order.sourceDomain);

  return {
    amountRub: order.amountRub,
    createdAt: order.createdAt,
    currency: order.currency,
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    orderUrl: `${siteUrl}/client/orders/${order.publicToken}`,
    paidAt: order.payment?.paidAt ?? null,
    participantCount: order.participantCount,
    participantNames: order.participants.map(
      (participant) => participant.fullName
    ),
    paymentProviderName: order.payment?.provider ?? null,
    paymentUrl: order.payment?.paymentUrl ?? null,
    receiptLabel: order.payment?.receiptLabel ?? null,
    receiptUrl: order.payment?.receiptUrl ?? null,
    selectedOptions: order.serviceOptions.map((option) => ({
      priceRub: option.totalRubSnapshot,
      quantity: option.quantitySnapshot,
      title: option.titleSnapshot
    })),
    serviceTitle: order.service.title
  };
}

async function getOrderForEmail(orderId: string) {
  return prisma.order.findUnique({
    where: {
      id: orderId
    },
    select: {
      amountRub: true,
      createdAt: true,
      currency: true,
      customerEmail: true,
      customerName: true,
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
          paidAt: true,
          paymentUrl: true,
          provider: true,
          receiptLabel: true,
          receiptUrl: true,
          status: true
        }
      },
      publicToken: true,
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
          quantitySnapshot: true,
          titleSnapshot: true,
          totalRubSnapshot: true
        }
      },
      sourceDomain: true
    }
  });
}

async function sendOrderEmail(
  orderId: string,
  buildTemplate: (order: OrderEmailData) => EmailTemplate
) {
  const order = await getOrderForEmail(orderId);
  const to = normalizeEmail(order?.customerEmail);

  if (!order || !to) {
    return {
      reason: "У заказа нет email клиента",
      skipped: true as const
    };
  }

  const template = buildTemplate(toOrderEmailData(order));

  return sendEmail({
    html: template.html,
    subject: template.subject,
    text: template.text,
    to
  });
}

export async function sendOrderCreatedEmail(orderId: string) {
  return sendOrderEmail(orderId, buildOrderCreatedEmail);
}

export async function sendPaymentSucceededEmail(orderId: string) {
  return sendOrderEmail(orderId, buildPaymentSucceededEmail);
}

export async function sendPaymentFailedEmail(orderId: string) {
  return sendOrderEmail(orderId, buildPaymentFailedEmail);
}

export async function sendPaymentReceiptEmail(orderId: string) {
  return sendOrderEmail(orderId, buildReceiptEmail);
}

export async function sendPaymentStatusEmail(
  orderId: string,
  status: PaymentStatus
) {
  if (status === PaymentStatus.SUCCEEDED) {
    return sendPaymentSucceededEmail(orderId);
  }

  if (
    status === PaymentStatus.FAILED ||
    status === PaymentStatus.CANCELLED ||
    status === PaymentStatus.REFUNDED
  ) {
    return sendPaymentFailedEmail(orderId);
  }

  return {
    reason: `Для статуса ${status} письмо клиенту не отправляется`,
    skipped: true as const
  };
}
