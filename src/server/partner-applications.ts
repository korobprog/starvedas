"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { organizationSettingsId } from "@/server/organization-settings";
import { UserRole } from "@prisma/client";

const nullableText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

const partnerApplicationSchema = z.object({
  bankDetails: nullableText(5000),
  comment: nullableText(5000),
  email: nullableText(320),
  fullName: z.string().trim().min(2).max(200),
  inn: z.string().trim().min(10).max(12).regex(/^\d+$/),
  ogrnip: nullableText(32),
  phone: z.string().trim().min(5).max(80),
  registrationAddress: nullableText(1000),
  rulesAccepted: z.literal(true),
  type: z.enum(["IP", "SELF_EMPLOYED"])
});

const moderationSchema = z.object({
  applicationId: z.string().min(1),
  adminComment: nullableText(2000)
});

const agreementTextSchema = z.object({
  partnerProgramAgreementText: z.string().trim().max(100_000)
});

async function requireCabinetCuratorId() {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CURATOR],
    "/cabinet"
  );

  if (user.role === UserRole.CURATOR) {
    const curator = await prisma.curator.findFirst({
      where: { active: true, userId: user.id },
      select: { id: true }
    });

    if (!curator) {
      throw new Error("Профиль куратора не найден");
    }

    return curator.id;
  }

  const curator = await prisma.curator.findUnique({
    where: { slug: "administrator" },
    select: { id: true }
  });

  if (!curator) {
    throw new Error("Профиль администратора не найден");
  }

  return curator.id;
}

export async function getPartnerProgramAgreementText() {
  const settings = await prisma.organizationSettings.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { partnerProgramAgreementText: true }
  });

  return settings?.partnerProgramAgreementText ?? "";
}

export async function submitPartnerApplicationAction(formData: FormData) {
  const curatorId = await requireCabinetCuratorId();
  const parsed = partnerApplicationSchema.safeParse({
    bankDetails: formData.get("bankDetails") ?? "",
    comment: formData.get("comment") ?? "",
    email: formData.get("email") ?? "",
    fullName: formData.get("fullName") ?? "",
    inn: formData.get("inn") ?? "",
    ogrnip: formData.get("ogrnip") ?? "",
    phone: formData.get("phone") ?? "",
    registrationAddress: formData.get("registrationAddress") ?? "",
    rulesAccepted: formData.get("rulesAccepted") === "on",
    type: formData.get("type") ?? "IP"
  });

  if (!parsed.success) {
    throw new Error("Проверьте данные партнёрской заявки и принятие правил");
  }

  await prisma.curatorPartnerApplication.upsert({
    where: { curatorId },
    create: {
      ...parsed.data,
      curatorId,
      status: "PENDING"
    },
    update: {
      ...parsed.data,
      adminComment: null,
      reviewedAt: null,
      reviewedById: null,
      status: "PENDING"
    }
  });

  revalidatePath("/cabinet");
  revalidatePath("/admin/curators");
}

export async function approvePartnerApplicationAction(formData: FormData) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/admin/curators"
  );
  const parsed = moderationSchema.safeParse({
    adminComment: formData.get("adminComment") ?? "",
    applicationId: formData.get("applicationId") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректная заявка");
  }

  await prisma.curatorPartnerApplication.update({
    where: { id: parsed.data.applicationId },
    data: {
      adminComment: parsed.data.adminComment,
      reviewedAt: new Date(),
      reviewedById: user.id,
      status: "APPROVED"
    }
  });

  revalidatePath("/cabinet");
  revalidatePath("/admin/curators");
}

export async function rejectPartnerApplicationAction(formData: FormData) {
  const user = await requireUser(
    [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    "/admin/curators"
  );
  const parsed = moderationSchema.safeParse({
    adminComment: formData.get("adminComment") ?? "",
    applicationId: formData.get("applicationId") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректная заявка");
  }

  await prisma.curatorPartnerApplication.update({
    where: { id: parsed.data.applicationId },
    data: {
      adminComment: parsed.data.adminComment,
      reviewedAt: new Date(),
      reviewedById: user.id,
      status: "REJECTED"
    }
  });

  revalidatePath("/cabinet");
  revalidatePath("/admin/curators");
}

export async function savePartnerProgramAgreementText(formData: FormData) {
  await requireUser([UserRole.SUPER_ADMIN], "/admin/organization");
  const parsed = agreementTextSchema.safeParse({
    partnerProgramAgreementText:
      formData.get("partnerProgramAgreementText") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Текст правил слишком длинный");
  }

  await prisma.organizationSettings.upsert({
    where: { id: organizationSettingsId },
    create: {
      id: organizationSettingsId,
      partnerProgramAgreementText: parsed.data.partnerProgramAgreementText
    },
    update: {
      partnerProgramAgreementText: parsed.data.partnerProgramAgreementText
    }
  });

  revalidatePath("/admin/organization");
  revalidatePath("/cabinet");
  revalidatePath("/legal/partner-agreement");
}
