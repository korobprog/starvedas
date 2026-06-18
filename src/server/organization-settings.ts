import type { OrganizationSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultLegalContact, type LegalContact } from "@/lib/legal-content";

export const organizationSettingsId = "default-organization-settings";

export const sellerTypeOptions = [
  { label: "ИП", value: "IP" },
  { label: "ООО", value: "OOO" },
  { label: "Самозанятый", value: "SELF_EMPLOYED" },
  { label: "Другое", value: "OTHER" }
] as const;

export type PublicOrganizationSettings = {
  contact: LegalContact;
  settings: OrganizationSettings | null;
};

function valueOrDefault(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function toPublicContact(settings: OrganizationSettings | null): LegalContact {
  return {
    seller: valueOrDefault(settings?.legalName, defaultLegalContact.seller),
    inn: valueOrDefault(settings?.inn, defaultLegalContact.inn),
    ogrnip: valueOrDefault(settings?.ogrn, defaultLegalContact.ogrnip),
    address: valueOrDefault(
      settings?.legalAddress,
      defaultLegalContact.address
    ),
    email: valueOrDefault(settings?.clientEmail, defaultLegalContact.email),
    phone: valueOrDefault(settings?.clientPhone, defaultLegalContact.phone),
    telegram: valueOrDefault(
      settings?.officialTelegram,
      defaultLegalContact.telegram
    ),
    supportHours: valueOrDefault(
      settings?.supportHours,
      defaultLegalContact.supportHours
    )
  };
}

export function shouldHideAdminSupportButtonsOnSource({
  curatorSlug,
  settings,
  sourceDomain
}: {
  curatorSlug?: string | null;
  settings?: Pick<
    OrganizationSettings,
    "hideChintamaniAdminSupportButtons"
  > | null;
  sourceDomain?: string | null;
}) {
  return (
    sourceDomain === "chintamanidhama.ru" &&
    curatorSlug === "administrator" &&
    Boolean(settings?.hideChintamaniAdminSupportButtons)
  );
}

export async function shouldHideAdminSupportButtonsOnSourceDomain({
  curatorSlug,
  sourceDomain
}: {
  curatorSlug?: string | null;
  sourceDomain?: string | null;
}) {
  if (
    sourceDomain !== "chintamanidhama.ru" ||
    curatorSlug !== "administrator"
  ) {
    return false;
  }

  const settings = await prisma.organizationSettings.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { hideChintamaniAdminSupportButtons: true }
  });

  return Boolean(settings?.hideChintamaniAdminSupportButtons);
}

export async function getPublicOrganizationSettings(): Promise<PublicOrganizationSettings> {
  try {
    const settings = await prisma.organizationSettings.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    return {
      contact: toPublicContact(settings),
      settings
    };
  } catch {
    return {
      contact: defaultLegalContact,
      settings: null
    };
  }
}
