"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/auth";
import {
  defaultMaintenanceMessage,
  defaultMaintenanceTelegram
} from "@/server/site-settings";
import { organizationSettingsId } from "@/server/organization-settings";

const maintenanceSettingsSchema = z.object({
  maintenanceMessage: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || defaultMaintenanceMessage),
  maintenanceMode: z.boolean(),
  maintenanceTelegram: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || defaultMaintenanceTelegram)
});

export async function saveMaintenanceSettings(formData: FormData) {
  await requireAdminUser("/admin/settings");

  const parsed = maintenanceSettingsSchema.safeParse({
    maintenanceMessage: formData.get("maintenanceMessage") ?? "",
    maintenanceMode: formData.get("maintenanceMode") === "on",
    maintenanceTelegram: formData.get("maintenanceTelegram") ?? ""
  });

  if (!parsed.success) {
    throw new Error("Некорректные настройки сервисного режима");
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
  revalidatePath("/maintenance");
  revalidatePath("/admin/settings");

  redirect("/admin/settings?saved=1");
}
