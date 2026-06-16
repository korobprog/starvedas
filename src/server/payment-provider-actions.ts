"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminUser } from "@/server/auth";
import {
  defaultPaymentProviders,
  getDefaultCuratorPaymentProviderState,
  paymentProviderCodes,
  serializeSupportedLocales
} from "@/server/payment-providers";

const paymentProviderSchema = z.object({
  active: z.boolean(),
  code: z.enum(paymentProviderCodes),
  supportedLocales: z.array(z.enum(["ru", "en", "hi"])).min(1)
});

const curatorPaymentOptionSchema = z.object({
  allowed: z.boolean(),
  code: z.enum(paymentProviderCodes),
  curatorId: z.string().trim().min(1)
});

export async function savePaymentProviderSettings(formData: FormData) {
  await requireSuperAdminUser("/admin/payments");

  const parsed = paymentProviderSchema.safeParse({
    active: formData.get("active") === "on",
    code: formData.get("code"),
    supportedLocales: formData.getAll("supportedLocales")
  });

  if (!parsed.success) {
    throw new Error("Некорректные настройки платежной системы");
  }

  const fallback = defaultPaymentProviders.find(
    (provider) => provider.code === parsed.data.code
  );

  if (!fallback) {
    throw new Error("Платежная система не найдена");
  }

  await prisma.paymentProvider.upsert({
    where: {
      code: parsed.data.code
    },
    create: {
      active: parsed.data.active,
      code: fallback.code,
      description: fallback.description,
      name: fallback.name,
      sortOrder: fallback.sortOrder,
      supportedLocales: serializeSupportedLocales(parsed.data.supportedLocales)
    },
    update: {
      active: parsed.data.active,
      supportedLocales: serializeSupportedLocales(parsed.data.supportedLocales)
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/payments");
}

export async function saveCuratorPaymentOptionSettings(formData: FormData) {
  await requireSuperAdminUser("/admin/payments");

  const parsed = curatorPaymentOptionSchema.safeParse({
    allowed: formData.get("allowed") === "on",
    code: formData.get("code"),
    curatorId: formData.get("curatorId")
  });

  if (!parsed.success) {
    throw new Error("Некорректные настройки оплаты куратора");
  }

  const [curator, provider, existingOption] = await Promise.all([
    prisma.curator.findUnique({
      where: {
        id: parsed.data.curatorId
      },
      select: {
        isSystem: true
      }
    }),
    prisma.paymentProvider.findUnique({
      where: {
        code: parsed.data.code
      },
      select: {
        code: true
      }
    }),
    prisma.curatorPaymentOption.findUnique({
      where: {
        curatorId_providerCode: {
          curatorId: parsed.data.curatorId,
          providerCode: parsed.data.code
        }
      },
      select: {
        enabled: true
      }
    })
  ]);

  if (!curator || !provider) {
    throw new Error("Куратор или способ оплаты не найден");
  }

  const defaultState = getDefaultCuratorPaymentProviderState({
    isSystem: curator.isSystem,
    providerCode: parsed.data.code
  });
  const enabled = parsed.data.allowed
    ? (existingOption?.enabled ?? defaultState.enabled)
    : false;

  await prisma.curatorPaymentOption.upsert({
    where: {
      curatorId_providerCode: {
        curatorId: parsed.data.curatorId,
        providerCode: parsed.data.code
      }
    },
    create: {
      allowed: parsed.data.allowed,
      curatorId: parsed.data.curatorId,
      enabled,
      providerCode: parsed.data.code
    },
    update: {
      allowed: parsed.data.allowed,
      enabled
    }
  });

  revalidatePath("/");
  revalidatePath("/admin/payments");
  revalidatePath("/cabinet");
}
