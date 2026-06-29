"use server";

import { ParticipantChangeAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry,
  normalizePhoneNumber
} from "@/lib/phone-validation";
import { getCurrentUser } from "@/server/auth";
import { canClientEditOrderStatus } from "@/server/client-order-permissions";
import { getCurrentClientProfile } from "@/server/client-auth";
import {
  getParticipantNames,
  isParticipantNameValid
} from "@/server/order-validation";
import {
  captureOrderRevision,
  orderRevisionEventTypes
} from "@/server/order-revisions";
import { saveClientParticipants } from "@/server/saved-participants";

export type ClientOrderEditActionState = {
  error?: string;
  success?: string;
};

const clientOrderEditSchema = z
  .object({
    customerEmail: z
      .union([
        z.string().trim().email("Введите корректный email"),
        z.literal("")
      ])
      .optional(),
    customerName: z.string().trim().min(2, "Введите имя заказчика").max(120),
    customerPhone: z.string().trim().max(50).optional(),
    customerPhoneCountry: z
      .string()
      .trim()
      .optional()
      .refine((country) => !country || isPhoneCountryCode(country), {
        message: "Некорректная страна телефона"
      }),
    customerTelegram: z.string().trim().max(120).optional(),
    participantsText: z.string().trim().min(2).max(5000),
    publicToken: z.string().trim().min(10)
  })
  .superRefine((data, ctx) => {
    if (
      data.customerPhone?.trim() &&
      !isValidPhoneNumberForCountry(
        data.customerPhone,
        data.customerPhoneCountry
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidPhoneMessage,
        path: ["customerPhone"]
      });
    }

    if (
      !data.customerTelegram?.trim() &&
      !data.customerPhone?.trim() &&
      !data.customerEmail?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите хотя бы один контакт",
        path: ["customerTelegram"]
      });
    }

    const names = getParticipantNames(data.participantsText);

    if (
      names.length > 200 ||
      names.some((name) => !isParticipantNameValid(name))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Каждая строка участника должна содержать имя и фамилию без цифр и лишних символов",
        path: ["participantsText"]
      });
    }
  });

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed || null;
}

export async function updateClientOrderAction(
  _state: ClientOrderEditActionState,
  formData: FormData
): Promise<ClientOrderEditActionState> {
  const client = await getCurrentClientProfile();

  if (!client) {
    return { error: "Нужно войти в личный кабинет" };
  }

  const parsed = clientOrderEditSchema.safeParse({
    customerEmail: formData.get("customerEmail") || undefined,
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone") || undefined,
    customerPhoneCountry: formData.get("customerPhoneCountry") || undefined,
    customerTelegram: formData.get("customerTelegram") || undefined,
    participantsText: formData.get("participantsText"),
    publicToken: formData.get("publicToken")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Проверьте данные заказа"
    };
  }

  const names = getParticipantNames(parsed.data.participantsText);
  const order = await prisma.order.findFirst({
    where: {
      clientId: client.id,
      deletedAt: null,
      publicToken: parsed.data.publicToken
    },
    select: {
      id: true,
      leadStatus: true,
      participantCount: true,
      participants: {
        orderBy: { sortOrder: "asc" },
        select: {
          fullName: true,
          id: true
        }
      },
      publicToken: true,
      status: true
    }
  });

  if (!order) {
    return { error: "Заказ не найден" };
  }

  if (!canClientEditOrderStatus(order)) {
    return {
      error:
        "Этот заказ уже нельзя изменить в кабинете. Напишите вашему куратору."
    };
  }

  if (names.length !== order.participantCount) {
    return {
      error:
        "Пока можно менять данные участников только без изменения их количества, чтобы сумма и ссылка на оплату не изменились."
    };
  }

  const currentUser = await getCurrentUser();
  const customerEmail = normalizeOptional(parsed.data.customerEmail);
  const customerPhone = normalizePhoneNumber(
    parsed.data.customerPhone,
    parsed.data.customerPhoneCountry
  );
  const customerTelegram = normalizeOptional(parsed.data.customerTelegram);

  try {
    await prisma.$transaction(async (tx) => {
      await captureOrderRevision(tx, {
        actorUserId: currentUser?.id,
        eventType: orderRevisionEventTypes.clientEdit,
        note: "Клиент изменил контакты или список участников",
        orderId: order.id
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          customerEmail,
          customerName: parsed.data.customerName,
          customerPhone,
          customerTelegram,
          participantsText: names.join("\n")
        }
      });

      await tx.clientProfile.update({
        where: { id: client.id },
        data: {
          email: customerEmail ?? client.email,
          name: parsed.data.customerName,
          phone: customerPhone ?? client.phone,
          telegram: customerTelegram ?? client.telegram
        }
      });

      await saveClientParticipants(tx, client.id, names);

      for (const [index, participant] of order.participants.entries()) {
        const nextName = names[index];

        if (!nextName || participant.fullName === nextName) {
          continue;
        }

        await tx.orderParticipant.update({
          where: { id: participant.id },
          data: { fullName: nextName }
        });

        await tx.participantChangeHistory.create({
          data: {
            action: ParticipantChangeAction.UPDATED,
            changedById: currentUser?.id,
            fromFullName: participant.fullName,
            note: "Участник изменён клиентом до оплаты",
            participantId: participant.id,
            toFullName: nextName
          }
        });
      }
    });
  } catch {
    console.error("Client order update failed");

    return { error: "Не удалось сохранить заказ. Попробуйте позже." };
  }

  revalidatePath("/client");
  revalidatePath(`/client/orders/${order.publicToken}`);
  revalidatePath(`/client/orders/${order.publicToken}/edit`);

  return { success: "Заказ сохранён" };
}
