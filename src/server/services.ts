import { type Prisma } from "@prisma/client";
import { normalizeLocale, type Locale } from "@/i18n/config";
import {
  convertRubToCurrency,
  formatMoney,
  getCurrencyForLocale,
  type Currency
} from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SHRADDHA_CHILD_HELP_TEXT,
  DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL,
  DEFAULT_SHRADDHA_UNBORN_LABEL,
  DEFAULT_SHRADDHA_WARNING_TEXT
} from "@/lib/shraddha";
import { type SiteService } from "@/lib/site-data";

const publicServiceSelect = {
  description: true,
  descriptionEn: true,
  descriptionHi: true,
  detailsContent: true,
  detailsContentEn: true,
  detailsContentHi: true,
  isSubscription: true,
  priceInr: true,
  priceRub: true,
  priceUnit: true,
  priceUsd: true,
  receiptName: true,
  vatTaxType: true,
  slug: true,
  subscriptionEndsAt: true,
  subscriptionStartsAt: true,
  title: true,
  titleEn: true,
  titleHi: true,
  vedicGiftDescription: true,
  vedicGiftEnabled: true,
  vedicGiftTitle: true,
  shraddhaModeEnabled: true,
  shraddhaWarningText: true,
  shraddhaUnbornLabel: true,
  shraddhaDeceasedChildLabel: true,
  shraddhaChildHelpText: true,
  options: {
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      description: true,
      descriptionEn: true,
      descriptionHi: true,
      eventStartsAt: true,
      id: true,
      priceInr: true,
      priceRub: true,
      priceUnit: true,
      priceUsd: true,
      sortOrder: true,
      title: true,
      titleEn: true,
      titleHi: true
    },
    where: {
      active: true
    }
  }
} satisfies Prisma.ServiceSelect;

const orderServiceSelect = {
  ...publicServiceSelect,
  id: true,
  isSubscription: true,
  subscriptionEndsAt: true,
  subscriptionStartsAt: true
} satisfies Prisma.ServiceSelect;

const managedServiceSelect = {
  _count: {
    select: {
      orders: {
        where: {
          deletedAt: null
        }
      }
    }
  },
  active: true,
  archivedAt: true,
  description: true,
  descriptionEn: true,
  descriptionHi: true,
  detailsContent: true,
  detailsContentEn: true,
  detailsContentHi: true,
  id: true,
  isSubscription: true,
  priceInr: true,
  priceRub: true,
  priceUnit: true,
  priceUsd: true,
  receiptName: true,
  vatTaxType: true,
  requiresExactParticipantList: true,
  slug: true,
  sortOrder: true,
  subscriptionEndsAt: true,
  subscriptionStartsAt: true,
  title: true,
  titleEn: true,
  titleHi: true,
  vedicGiftDescription: true,
  vedicGiftEnabled: true,
  vedicGiftTitle: true,
  shraddhaModeEnabled: true,
  shraddhaWarningText: true,
  shraddhaUnbornLabel: true,
  shraddhaDeceasedChildLabel: true,
  shraddhaChildHelpText: true,
  options: {
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      _count: {
        select: {
          orderItems: true
        }
      },
      active: true,
      description: true,
      descriptionEn: true,
      descriptionHi: true,
      eventStartsAt: true,
      id: true,
      priceInr: true,
      priceRub: true,
      priceUnit: true,
      priceUsd: true,
      sortOrder: true,
      title: true,
      titleEn: true,
      titleHi: true
    }
  }
} satisfies Prisma.ServiceSelect;

type PublicServiceRow = Prisma.ServiceGetPayload<{
  select: typeof publicServiceSelect;
}>;

export type OrderService = Prisma.ServiceGetPayload<{
  select: typeof orderServiceSelect;
}> & {
  currency: Currency;
  localizedDescription: string;
  localizedPrice: number;
  localizedTitle: string;
};

export type ManagedService = Prisma.ServiceGetPayload<{
  select: typeof managedServiceSelect;
}>;

function getLocalizedTitle(service: PublicServiceRow, locale: Locale) {
  if (locale === "en") {
    return service.titleEn?.trim() || service.title;
  }

  if (locale === "hi") {
    return service.titleHi?.trim() || service.titleEn?.trim() || service.title;
  }

  return service.title;
}

function getLocalizedDescription(service: PublicServiceRow, locale: Locale) {
  if (locale === "en") {
    return service.descriptionEn?.trim() || service.description || "";
  }

  if (locale === "hi") {
    return (
      service.descriptionHi?.trim() ||
      service.descriptionEn?.trim() ||
      service.description ||
      ""
    );
  }

  return service.description || "";
}

function getLocalizedDetailsContent(service: PublicServiceRow, locale: Locale) {
  if (locale === "en") {
    return service.detailsContentEn?.trim() || service.detailsContent || "";
  }

  if (locale === "hi") {
    return (
      service.detailsContentHi?.trim() ||
      service.detailsContentEn?.trim() ||
      service.detailsContent ||
      ""
    );
  }

  return service.detailsContent || "";
}

function getLocalizedOptionTitle(
  option: PublicServiceRow["options"][number],
  locale: Locale
) {
  if (locale === "en") {
    return option.titleEn?.trim() || option.title;
  }

  if (locale === "hi") {
    return option.titleHi?.trim() || option.titleEn?.trim() || option.title;
  }

  return option.title;
}

function getLocalizedOptionDescription(
  option: PublicServiceRow["options"][number],
  locale: Locale
) {
  if (locale === "en") {
    return option.descriptionEn?.trim() || option.description || "";
  }

  if (locale === "hi") {
    return (
      option.descriptionHi?.trim() ||
      option.descriptionEn?.trim() ||
      option.description ||
      ""
    );
  }

  return option.description || "";
}

function getLocalizedPrice(service: PublicServiceRow, currency: Currency) {
  if (currency === "USD") {
    return (
      service.priceUsd ??
      Math.round(convertRubToCurrency(service.priceRub, currency))
    );
  }

  if (currency === "INR") {
    return (
      service.priceInr ??
      Math.round(convertRubToCurrency(service.priceRub, currency))
    );
  }

  return service.priceRub;
}

function getLocalizedOptionPrice(
  option: PublicServiceRow["options"][number],
  currency: Currency
) {
  if (currency === "USD") {
    return (
      option.priceUsd ??
      Math.round(convertRubToCurrency(option.priceRub, currency))
    );
  }

  if (currency === "INR") {
    return (
      option.priceInr ??
      Math.round(convertRubToCurrency(option.priceRub, currency))
    );
  }

  return option.priceRub;
}

function createPriceLabel(
  priceAmount: number,
  currency: Currency,
  priceUnit: SiteService["priceUnit"]
) {
  return formatMoney(priceAmount, currency, {
    perName: priceUnit === "PER_NAME",
    perParticipant: priceUnit === "PER_PARTICIPANT"
  });
}

function formatMoscowEventLabel(value: Date | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
    year: "numeric"
  }).format(value);
}

function toSiteService(
  service: PublicServiceRow,
  localeValue?: string | null
): SiteService {
  const locale = normalizeLocale(localeValue);
  const currency = getCurrencyForLocale(locale);
  const priceAmount = getLocalizedPrice(service, currency);
  const sortedOptions = service.isSubscription
    ? []
    : [...service.options]
        .filter(isUpcomingOption)
        .sort(compareServiceOptionsByDate);

  return {
    currency,
    description: getLocalizedDescription(service, locale),
    detailsContent: getLocalizedDetailsContent(service, locale),
    isSubscription: service.isSubscription,
    options: sortedOptions.map((option) => {
      const optionPriceAmount = getLocalizedOptionPrice(option, currency);

      return {
        currency,
        description: getLocalizedOptionDescription(option, locale),
        eventStartsAt: option.eventStartsAt?.toISOString() ?? null,
        eventStartsAtLabel: formatMoscowEventLabel(option.eventStartsAt),
        id: option.id,
        priceAmount: optionPriceAmount,
        priceLabel: createPriceLabel(
          optionPriceAmount,
          currency,
          option.priceUnit
        ),
        priceRub: option.priceRub,
        priceUnit: option.priceUnit,
        title: getLocalizedOptionTitle(option, locale)
      };
    }),
    priceAmount,
    priceLabel: createPriceLabel(priceAmount, currency, service.priceUnit),
    priceRub: service.priceRub,
    priceUnit: service.priceUnit,
    slug: service.slug,
    subscriptionEndsAt: service.subscriptionEndsAt?.toISOString() ?? null,
    subscriptionEndsAtLabel: formatMoscowEventLabel(service.subscriptionEndsAt),
    subscriptionStartsAt: service.subscriptionStartsAt?.toISOString() ?? null,
    subscriptionStartsAtLabel: formatMoscowEventLabel(
      service.subscriptionStartsAt
    ),
    title: getLocalizedTitle(service, locale),
    vedicGiftDescription: service.vedicGiftDescription?.trim() || "",
    vedicGiftEnabled: service.vedicGiftEnabled,
    vedicGiftTitle:
      service.vedicGiftTitle?.trim() ||
      "🎁 Подарок: ведический астрологический разбор",
    shraddhaModeEnabled: service.shraddhaModeEnabled,
    shraddhaWarningText:
      service.shraddhaWarningText?.trim() || DEFAULT_SHRADDHA_WARNING_TEXT,
    shraddhaUnbornLabel:
      service.shraddhaUnbornLabel?.trim() || DEFAULT_SHRADDHA_UNBORN_LABEL,
    shraddhaDeceasedChildLabel:
      service.shraddhaDeceasedChildLabel?.trim() ||
      DEFAULT_SHRADDHA_DECEASED_CHILD_LABEL,
    shraddhaChildHelpText:
      service.shraddhaChildHelpText?.trim() || DEFAULT_SHRADDHA_CHILD_HELP_TEXT
  };
}

function withOrderLocale(
  service: Prisma.ServiceGetPayload<{ select: typeof orderServiceSelect }>,
  localeValue?: string | null
): OrderService {
  const locale = normalizeLocale(localeValue);
  const currency = getCurrencyForLocale(locale);

  return {
    ...service,
    options: service.options
      .filter(isUpcomingOption)
      .sort(compareServiceOptionsByDate),
    currency,
    localizedDescription: getLocalizedDescription(service, locale),
    localizedPrice: getLocalizedPrice(service, currency),
    localizedTitle: getLocalizedTitle(service, locale)
  };
}

function isUpcomingOption(option: { eventStartsAt: Date | null }) {
  return !option.eventStartsAt || option.eventStartsAt.getTime() > Date.now();
}

function compareServiceOptionsByDate(
  left: {
    eventStartsAt: Date | null;
    sortOrder: number;
    title: string;
  },
  right: {
    eventStartsAt: Date | null;
    sortOrder: number;
    title: string;
  }
) {
  if (left.eventStartsAt && right.eventStartsAt) {
    const dateDiff =
      left.eventStartsAt.getTime() - right.eventStartsAt.getTime();

    if (dateDiff !== 0) {
      return dateDiff;
    }
  }

  if (left.eventStartsAt && !right.eventStartsAt) {
    return -1;
  }

  if (!left.eventStartsAt && right.eventStartsAt) {
    return 1;
  }

  const sortDiff = left.sortOrder - right.sortOrder;

  if (sortDiff !== 0) {
    return sortDiff;
  }

  return left.title.localeCompare(right.title, "ru");
}

export async function getPublicServices(
  locale?: string | null
): Promise<SiteService[]> {
  try {
    const services = await prisma.service.findMany({
      where: {
        active: true,
        archivedAt: null
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          title: "asc"
        }
      ],
      select: publicServiceSelect
    });

    if (services.length > 0) {
      return services.map((service) => toSiteService(service, locale));
    }
  } catch {
    return [];
  }

  return [];
}

export async function getManagedServices({
  archived = false
}: {
  archived?: boolean;
} = {}): Promise<ManagedService[]> {
  return prisma.service.findMany({
    orderBy: [
      ...(archived
        ? [
            {
              archivedAt: "desc" as const
            }
          ]
        : []),
      {
        sortOrder: "asc"
      },
      {
        title: "asc"
      }
    ],
    where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
    select: managedServiceSelect
  });
}

export async function getManagedService(
  id: string
): Promise<ManagedService | null> {
  return prisma.service.findFirst({
    where: { archivedAt: null, id },
    select: managedServiceSelect
  });
}

export async function getServiceForOrder(
  slug: string,
  locale?: string | null
): Promise<OrderService | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const service = await prisma.service.findFirst({
    where: {
      active: true,
      archivedAt: null,
      slug: normalizedSlug
    },
    select: orderServiceSelect
  });

  if (service) {
    return withOrderLocale(service, locale);
  }

  return null;
}
