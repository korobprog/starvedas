"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { getCuratorPaymentProviderSettings } from "@/server/payment-providers";
import { ensureSystemCurator } from "@/server/referrals";

const optionalPaymentText = z
  .string()
  .trim()
  .max(5000)
  .transform((value) => value || null);

const optionalPaymentShortText = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null);

const paymentOptionSettingsSchema = z.object({
  accountNumber: optionalPaymentShortText,
  bankName: optionalPaymentShortText,
  enabled: z.boolean(),
  instructions: optionalPaymentText,
  paymentComment: optionalPaymentShortText,
  phone: optionalPaymentShortText,
  recipientName: optionalPaymentShortText,
  verificationPeriod: optionalPaymentShortText
});

export async function saveCabinetPaymentSettings(formData: FormData) {
  await requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], "/cabinet");
  const curatorId = (await ensureSystemCurator()).id;

  if (!curatorId) {
    throw new Error("Профиль куратора не найден");
  }

  const providers = await getCuratorPaymentProviderSettings(curatorId);
  const editableProviders = providers.filter(
    (provider) => provider.active && provider.allowed
  );

  await prisma.$transaction(
    editableProviders.map((provider) => {
      const parsed = paymentOptionSettingsSchema.safeParse({
        accountNumber: formData.get(`accountNumber:${provider.code}`) ?? "",
        bankName: formData.get(`bankName:${provider.code}`) ?? "",
        enabled: formData.get(`enabled:${provider.code}`) === "on",
        instructions: formData.get(`instructions:${provider.code}`) ?? "",
        paymentComment: formData.get(`paymentComment:${provider.code}`) ?? "",
        phone: formData.get(`phone:${provider.code}`) ?? "",
        recipientName: formData.get(`recipientName:${provider.code}`) ?? "",
        verificationPeriod:
          formData.get(`verificationPeriod:${provider.code}`) ?? ""
      });

      if (!parsed.success) {
        throw new Error("Некорректные платежные инструкции");
      }

      return prisma.curatorPaymentOption.upsert({
        where: {
          curatorId_providerCode: {
            curatorId,
            providerCode: provider.code
          }
        },
        create: {
          ...parsed.data,
          allowed: true,
          curatorId,
          providerCode: provider.code
        },
        update: parsed.data
      });
    })
  );

  revalidatePath("/");
  revalidatePath("/admin/payments");
  revalidatePath("/cabinet");
}
