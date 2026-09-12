import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { organizationSettingsId } from "@/server/organization-settings";

export async function isPitriPakshaModuleEnabled(): Promise<boolean> {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { pitriPakshaEnabled: true }
    });

    return Boolean(settings?.pitriPakshaEnabled);
  } catch {
    return false;
  }
}

export async function getHiddenServiceModuleKeys(): Promise<string[]> {
  const pitriPakshaEnabled = await isPitriPakshaModuleEnabled();

  return pitriPakshaEnabled ? [] : ["pitri-paksha"];
}

export function buildModuleVisibilityWhere(
  hiddenModuleKeys: readonly string[]
): Prisma.ServiceWhereInput {
  if (hiddenModuleKeys.length === 0) {
    return {};
  }

  return {
    OR: [{ moduleKey: null }, { moduleKey: { notIn: [...hiddenModuleKeys] } }]
  };
}

export async function setPitriPakshaModuleEnabled(enabled: boolean) {
  await prisma.organizationSettings.upsert({
    where: { id: organizationSettingsId },
    create: {
      id: organizationSettingsId,
      pitriPakshaEnabled: enabled
    },
    update: {
      pitriPakshaEnabled: enabled
    }
  });
}
