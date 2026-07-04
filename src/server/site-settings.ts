import type { OrganizationSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const defaultMaintenanceMessage =
  "На сайте идут обновления.\nСкоро сайт снова заработает.\nПо вопросам напишите администратору.";

export const defaultMaintenanceTelegram = "@art_om108";

export type MaintenanceSettings = {
  adminTelegram: string;
  adminTelegramUrl: string;
  message: string;
  mode: boolean;
};

type MaintenanceFields = Pick<
  OrganizationSettings,
  "maintenanceMessage" | "maintenanceMode" | "maintenanceTelegram"
>;

function normalizeTelegram(value: string | null | undefined) {
  const raw = value?.trim() || defaultMaintenanceTelegram;

  if (raw.startsWith("https://t.me/")) {
    const username = raw.replace("https://t.me/", "").replace(/^@/, "");

    return {
      label: `@${username}`,
      url: `https://t.me/${username}`
    };
  }

  if (raw.startsWith("@")) {
    return {
      label: raw,
      url: `https://t.me/${raw.slice(1)}`
    };
  }

  return {
    label: `@${raw}`,
    url: `https://t.me/${raw}`
  };
}

export function toMaintenanceSettings(
  settings: MaintenanceFields | null
): MaintenanceSettings {
  const telegram = normalizeTelegram(settings?.maintenanceTelegram);

  return {
    adminTelegram: telegram.label,
    adminTelegramUrl: telegram.url,
    message: settings?.maintenanceMessage?.trim() || defaultMaintenanceMessage,
    mode: Boolean(settings?.maintenanceMode)
  };
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        maintenanceMessage: true,
        maintenanceMode: true,
        maintenanceTelegram: true
      }
    });

    return toMaintenanceSettings(settings);
  } catch {
    return toMaintenanceSettings(null);
  }
}
