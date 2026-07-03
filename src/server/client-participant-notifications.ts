import { OrderStatus, ParticipantRowStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendParticipantNamesProcessedEmail } from "@/server/email/order-emails";
import { getSiteUrlForSourceDomain } from "@/server/email/site-url";
import { sendClientParticipantNamesProcessedTelegramNotification } from "@/server/telegram-notifications";

export type ClientNamesProcessedNotificationResult =
  | { notified: true; orderNumber: number }
  | { notified: false; reason: string };

function getClientOrderUrl(sourceDomain: string, publicToken: string) {
  return `${getSiteUrlForSourceDomain(sourceDomain)}/client/orders/${publicToken}`;
}

export async function notifyClientAfterParticipantNamesProcessed(
  orderId: string
): Promise<ClientNamesProcessedNotificationResult> {
  const claim = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        deletedAt: null,
        id: orderId,
        status: OrderStatus.PAID
      },
      select: {
        client: {
          select: {
            telegramId: true
          }
        },
        customerEmail: true,
        customerName: true,
        orderNumber: true,
        participantCount: true,
        participantList: {
          select: {
            clientNamesProcessedNotifiedAt: true,
            id: true
          }
        },
        participants: {
          select: {
            rowStatus: true
          }
        },
        publicToken: true,
        service: {
          select: {
            title: true
          }
        },
        sourceDomain: true
      }
    });

    if (!order) {
      return { claimed: false as const, reason: "Оплаченный заказ не найден" };
    }

    if (!order.participantList) {
      return { claimed: false as const, reason: "Список участников не создан" };
    }

    if (order.participantList.clientNamesProcessedNotifiedAt) {
      return { claimed: false as const, reason: "Клиент уже уведомлён" };
    }

    if (!order.participants.length) {
      return { claimed: false as const, reason: "В заказе нет имён" };
    }

    const allProcessed = order.participants.every(
      (participant) => participant.rowStatus === ParticipantRowStatus.CHECKED
    );

    if (!allProcessed) {
      return { claimed: false as const, reason: "Не все имена обработаны" };
    }

    const hasEmail = Boolean(order.customerEmail?.trim());
    const hasTelegram = Boolean(order.client?.telegramId?.trim());

    if (!hasEmail && !hasTelegram) {
      return {
        claimed: false as const,
        reason: "У клиента нет email или привязанного Telegram"
      };
    }

    const updated = await tx.participantList.updateMany({
      data: {
        clientNamesProcessedNotifiedAt: new Date()
      },
      where: {
        clientNamesProcessedNotifiedAt: null,
        id: order.participantList.id
      }
    });

    if (updated.count === 0) {
      return { claimed: false as const, reason: "Клиент уже уведомляется" };
    }

    return {
      claimed: true as const,
      order: {
        clientTelegramId: order.client?.telegramId ?? null,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        orderUrl: getClientOrderUrl(order.sourceDomain, order.publicToken),
        participantCount: order.participantCount,
        serviceTitle: order.service.title
      }
    };
  });

  if (!claim.claimed) {
    return { notified: false, reason: claim.reason };
  }

  const hasEmail = Boolean(claim.order.customerEmail?.trim());
  const hasTelegram = Boolean(claim.order.clientTelegramId?.trim());

  if (!hasEmail && !hasTelegram) {
    return {
      notified: false,
      reason: "У клиента нет email или привязанного Telegram"
    };
  }

  const results = await Promise.allSettled([
    hasEmail
      ? sendParticipantNamesProcessedEmail(orderId)
      : Promise.resolve({ reason: "Email клиента не указан", skipped: true }),
    hasTelegram
      ? sendClientParticipantNamesProcessedTelegramNotification({
          chatId: claim.order.clientTelegramId,
          customerName: claim.order.customerName,
          orderNumber: claim.order.orderNumber,
          orderUrl: claim.order.orderUrl,
          participantCount: claim.order.participantCount,
          serviceTitle: claim.order.serviceTitle
        })
      : Promise.resolve(false)
  ]);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Client names processed notification failed", result.reason);
    }
  });

  return { notified: true, orderNumber: claim.order.orderNumber };
}
