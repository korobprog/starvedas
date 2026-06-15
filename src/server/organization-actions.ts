"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdminUser } from "@/server/auth";
import { organizationSettingsId } from "@/server/organization-settings";

const nullableText = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => value || null);

const organizationSettingsSchema = z.object({
  bankDetails: nullableText,
  cashboxDetails: nullableText,
  clientEmail: nullableText,
  clientPhone: nullableText,
  directorName: nullableText,
  inn: nullableText,
  legalAddress: nullableText,
  legalName: nullableText,
  officialTelegram: nullableText,
  ogrn: nullableText,
  postalAddress: nullableText,
  publicRecipientName: nullableText,
  sellerType: z.enum(["IP", "OOO", "SELF_EMPLOYED", "OTHER"]),
  supportHours: nullableText
});

export async function saveOrganizationSettings(formData: FormData) {
  await requireSuperAdminUser("/admin/organization");

  const parsed = organizationSettingsSchema.safeParse({
    bankDetails: formData.get("bankDetails") ?? "",
    cashboxDetails: formData.get("cashboxDetails") ?? "",
    clientEmail: formData.get("clientEmail") ?? "",
    clientPhone: formData.get("clientPhone") ?? "",
    directorName: formData.get("directorName") ?? "",
    inn: formData.get("inn") ?? "",
    legalAddress: formData.get("legalAddress") ?? "",
    legalName: formData.get("legalName") ?? "",
    officialTelegram: formData.get("officialTelegram") ?? "",
    ogrn: formData.get("ogrn") ?? "",
    postalAddress: formData.get("postalAddress") ?? "",
    publicRecipientName: formData.get("publicRecipientName") ?? "",
    sellerType: formData.get("sellerType") ?? "IP",
    supportHours: formData.get("supportHours") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные организации");
  }

  await prisma.organizationSettings.upsert({
    where: { id: organizationSettingsId },
    create: {
      id: organizationSettingsId,
      ...parsed.data
    },
    update: parsed.data
  });

  revalidatePath("/");
  revalidatePath("/admin/organization");
  revalidatePath("/contacts");
  revalidatePath("/legal/offer");
  revalidatePath("/legal/personal-data-consent");
  revalidatePath("/legal/privacy");
  revalidatePath("/refund");
}

export async function setCuratorServicePermission(formData: FormData) {
  await requireSuperAdminUser("/admin/organization");

  const allowCuratorManageServices =
    formData.get("allowCuratorManageServices") === "on";

  await prisma.organizationSettings.upsert({
    where: { id: organizationSettingsId },
    create: {
      allowCuratorManageServices,
      id: organizationSettingsId
    },
    update: {
      allowCuratorManageServices
    }
  });

  revalidatePath("/admin/organization");
  revalidatePath("/cabinet");
}
