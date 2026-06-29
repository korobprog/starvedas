"use server";

import {
  LeadStatus,
  OrderStatus,
  ParticipantChangeAction,
  PaymentStatus,
  UserRole
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { markOrderClientBought } from "@/server/client-profiles";
import {
  sendPaymentReceiptEmail,
  sendPaymentSucceededEmail
} from "@/server/email/order-emails";
import {
  captureOrderRevision,
  orderRevisionEventTypes
} from "@/server/order-revisions";
import { isCustomPaymentProviderCode } from "@/server/payment-providers";

const orderIdSchema = z.object({
  orderId: z.string().trim().min(1)
});

const paymentReceiptSchema = z.object({
  orderId: z.string().trim().min(1),
  receiptLabel: z.string().trim().max(120).optional(),
  receiptUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        value.startsWith("https://") ||
        value.startsWith("http://"),
      {
        message: "Укажите ссылку на чек или путь к файлу"
      }
    )
});

const participantUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(240),
  participantId: z.string().trim().min(1)
});

function revalidateOrderWorkspaces() {
  revalidatePath("/admin/participants");
  revalidatePath("/admin/clients");
  revalidatePath("/admin/recovery");
  revalidatePath("/cabinet");
}

export async function savePaymentReceiptAction(formData: FormData) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );
  const parsed = paymentReceiptSchema.safeParse({
    orderId: formData.get("orderId"),
    receiptLabel: formData.get("receiptLabel") || undefined,
    receiptUrl: formData.get("receiptUrl") || undefined
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Некорректные данные чека"
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
      id: parsed.data.orderId
    },
    select: {
      curatorId: true,
      id: true,
      payment: {
        select: {
          id: true
        }
      },
      publicToken: true
    }
  });

  if (!order?.payment) {
    throw new Error("Заказ или платёж не найден");
  }

  if (user.role === UserRole.CURATOR && order.curatorId !== user.curator?.id) {
    throw new Error("Нет доступа к заказу");
  }

  const receiptUrl = parsed.data.receiptUrl?.trim() || null;
  const receiptLabel = parsed.data.receiptLabel?.trim() || null;
  const paymentId = order.payment.id;

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: user.id,
      eventType: orderRevisionEventTypes.paymentReceipt,
      note: "Изменены ссылка или подпись чека",
      orderId: order.id
    });

    await tx.payment.update({
      where: {
        id: paymentId
      },
      data: {
        receiptLabel,
        receiptUploadedAt: receiptUrl ? new Date() : null,
        receiptUrl
      }
    });
  });

  revalidateOrderWorkspaces();
  revalidatePath(`/client/orders/${order.publicToken}`);

  if (receiptUrl) {
    try {
      await sendPaymentReceiptEmail(order.id);
    } catch {
      console.error("Payment receipt email failed");
    }
  }
}

export async function confirmCustomPaymentAction(formData: FormData) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );
  const parsed = orderIdSchema.safeParse({
    orderId: formData.get("orderId")
  });

  if (!parsed.success) {
    throw new Error("Некорректный заказ");
  }

  const order = await prisma.order.findFirst({
    where: {
      deletedAt: null,
      id: parsed.data.orderId
    },
    select: {
      curatorId: true,
      id: true,
      leadStatus: true,
      payment: {
        select: {
          provider: true,
          status: true
        }
      },
      status: true
    }
  });

  if (!order || !order.payment) {
    throw new Error("Заказ не найден");
  }

  if (user.role === UserRole.CURATOR && order.curatorId !== user.curator?.id) {
    throw new Error("Нет доступа к заказу");
  }

  if (
    order.status !== OrderStatus.WAITING_PAYMENT_VERIFICATION ||
    order.payment.status !== PaymentStatus.AWAITING_VERIFICATION ||
    !isCustomPaymentProviderCode(order.payment.provider)
  ) {
    throw new Error("Этот платеж нельзя подтвердить вручную");
  }

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: user.id,
      eventType: orderRevisionEventTypes.manualPaymentConfirm,
      note: "Ручное подтверждение оплаты администратором или куратором",
      orderId: order.id
    });

    await tx.payment.update({
      where: {
        orderId: order.id
      },
      data: {
        paidAt: new Date(),
        status: PaymentStatus.SUCCEEDED
      }
    });

    await tx.order.update({
      where: {
        id: order.id
      },
      data: {
        leadStatus: LeadStatus.PAID,
        status: OrderStatus.PAID
      }
    });

    await markOrderClientBought(tx, order.id, "manual-confirmation");

    if (order.leadStatus !== LeadStatus.PAID) {
      await tx.leadStatusHistory.create({
        data: {
          changedById: user.id,
          fromStatus: order.leadStatus,
          note: "Оплата подтверждена вручную",
          orderId: order.id,
          toStatus: LeadStatus.PAID
        }
      });
    }
  });

  try {
    await sendPaymentSucceededEmail(order.id);
  } catch {
    console.error("Manual payment confirmation email failed");
  }

  revalidateOrderWorkspaces();
}

export async function updateParticipantAction(formData: FormData) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );
  const parsed = participantUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    participantId: formData.get("participantId")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные участника");
  }

  const participant = await prisma.orderParticipant.findUnique({
    where: {
      id: parsed.data.participantId
    },
    select: {
      fullName: true,
      id: true,
      order: {
        select: {
          curatorId: true,
          id: true,
          status: true
        }
      },
      orderId: true
    }
  });

  if (!participant) {
    throw new Error("Участник не найден");
  }

  if (
    user.role === UserRole.CURATOR &&
    (participant.order.curatorId !== user.curator?.id ||
      participant.order.status !== OrderStatus.PAID)
  ) {
    throw new Error("Нет доступа к участнику");
  }

  if (participant.fullName === parsed.data.fullName) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await captureOrderRevision(tx, {
      actorUserId: user.id,
      eventType: orderRevisionEventTypes.adminParticipantEdit,
      note: "Изменение участника в кабинете",
      orderId: participant.orderId
    });

    await tx.orderParticipant.update({
      where: {
        id: participant.id
      },
      data: {
        fullName: parsed.data.fullName
      }
    });

    const participants = await tx.orderParticipant.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        fullName: true
      },
      where: {
        orderId: participant.orderId
      }
    });

    await tx.order.update({
      where: {
        id: participant.orderId
      },
      data: {
        participantCount: participants.length,
        participantsText: participants.map((item) => item.fullName).join("\n")
      }
    });

    await tx.participantChangeHistory.create({
      data: {
        action: ParticipantChangeAction.UPDATED,
        changedById: user.id,
        fromFullName: participant.fullName,
        note: "Имя участника изменено",
        participantId: participant.id,
        toFullName: parsed.data.fullName
      }
    });
  });

  revalidateOrderWorkspaces();
}
