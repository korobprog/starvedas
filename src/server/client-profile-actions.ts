"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry,
  normalizePhoneNumber
} from "@/lib/phone-validation";
import { getCurrentUser, requireAdminUser } from "@/server/auth";
import { getCurrentClientProfile } from "@/server/client-auth";

export type ClientProfileActionState = {
  error?: string;
  success?: string;
};

const clientProfileSchema = z
  .object({
    consentMailings: z.boolean().default(false),
    email: z.string().trim().email("Введите корректный email"),
    name: z.string().trim().min(2, "Введите имя").max(120),
    phone: z.string().trim().max(50).optional(),
    phoneCountry: z
      .string()
      .trim()
      .optional()
      .refine((country) => !country || isPhoneCountryCode(country), {
        message: "Некорректная страна телефона"
      }),
    telegram: z.string().trim().max(120).optional()
  })
  .superRefine((data, ctx) => {
    if (
      data.phone?.trim() &&
      !isValidPhoneNumberForCountry(data.phone, data.phoneCountry)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidPhoneMessage,
        path: ["phone"]
      });
    }
  });

const transferClientsSchema = z.object({
  clientIds: z.array(z.string().trim().min(1)).min(1),
  targetCuratorId: z.string().trim().min(1)
});

function getBooleanFormValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed || null;
}

export async function updateClientProfileAction(
  _state: ClientProfileActionState,
  formData: FormData
): Promise<ClientProfileActionState> {
  const client = await getCurrentClientProfile();

  if (!client) {
    return { error: "Нужно войти в личный кабинет" };
  }

  const parsed = clientProfileSchema.safeParse({
    consentMailings: getBooleanFormValue(formData.get("consentMailings")),
    email: formData.get("email"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    phoneCountry: formData.get("phoneCountry") || undefined,
    telegram: formData.get("telegram") || undefined
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Проверьте данные профиля"
    };
  }

  const currentUser = await getCurrentUser();
  const email = parsed.data.email.toLocaleLowerCase("ru");
  const existingUser = await prisma.user.findFirst({
    select: { id: true },
    where: {
      email,
      id: currentUser?.id ? { not: currentUser.id } : undefined
    }
  });

  if (existingUser) {
    return { error: "Этот email уже используется другим аккаунтом" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.clientProfile.update({
        where: { id: client.id },
        data: {
          consentMailings: parsed.data.consentMailings,
          consentMailingsAt:
            parsed.data.consentMailings && !client.consentMailings
              ? new Date()
              : undefined,
          consentMailingsSource:
            parsed.data.consentMailings && !client.consentMailings
              ? "client-profile"
              : undefined,
          email,
          name: parsed.data.name,
          phone: normalizePhoneNumber(
            parsed.data.phone,
            parsed.data.phoneCountry
          ),
          telegram: normalizeOptional(parsed.data.telegram)
        }
      });

      if (currentUser?.role === "CLIENT") {
        await tx.user.update({
          where: { id: currentUser.id },
          data: {
            email,
            name: parsed.data.name
          }
        });
      }
    });
  } catch {
    console.error("Client profile update failed");

    return { error: "Не удалось сохранить профиль. Попробуйте позже." };
  }

  revalidatePath("/client");
  revalidatePath("/client/profile");

  return { success: "Профиль сохранён" };
}

export async function transferClientsToCuratorAction(formData: FormData) {
  await requireAdminUser("/admin/clients");

  const parsed = transferClientsSchema.safeParse({
    clientIds: Array.from(
      new Set(
        formData
          .getAll("clientIds")
          .map((id) => String(id).trim())
          .filter(Boolean)
      )
    ),
    targetCuratorId: formData.get("targetCuratorId")
  });

  if (!parsed.success) {
    redirect("/admin/clients?transferError=select");
  }

  const targetCurator = await prisma.curator.findFirst({
    where: {
      active: true,
      id: parsed.data.targetCuratorId
    },
    select: {
      id: true,
      referralLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          slug: true
        },
        where: {
          active: true
        }
      },
      slug: true
    }
  });

  if (!targetCurator) {
    redirect("/admin/clients?transferError=curator");
  }

  const referralSlug =
    targetCurator.referralLinks[0]?.slug ?? targetCurator.slug;

  const result = await prisma.clientProfile.updateMany({
    where: {
      id: {
        in: parsed.data.clientIds
      }
    },
    data: {
      curatorId: targetCurator.id,
      referralSlug
    }
  });

  revalidatePath("/admin/clients");
  revalidatePath("/admin/curators");
  revalidatePath("/cabinet");

  redirect(`/admin/clients?transferred=${result.count}`);
}
