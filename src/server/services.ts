import { PriceUnit as PrismaPriceUnit, type Prisma } from "@prisma/client";
import { normalizeLocale, type Locale } from "@/i18n/config";
import {
  convertRubToCurrency,
  formatMoney,
  getCurrencyForLocale,
  type Currency
} from "@/i18n/pricing";
import { prisma } from "@/lib/prisma";
import {
  services as defaultServices,
  type SiteService,
  type SiteServiceList
} from "@/lib/site-data";

const publicServiceSelect = {
  description: true,
  descriptionEn: true,
  descriptionHi: true,
  priceInr: true,
  priceRub: true,
  priceUnit: true,
  priceUsd: true,
  receiptName: true,
  vatTaxType: true,
  slug: true,
  title: true,
  titleEn: true,
  titleHi: true,
  options: {
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      description: true,
      id: true,
      priceInr: true,
      priceRub: true,
      priceUsd: true,
      title: true
    },
    where: {
      active: true
    }
  }
} satisfies Prisma.ServiceSelect;

const orderServiceSelect = {
  ...publicServiceSelect,
  id: true
} satisfies Prisma.ServiceSelect;

const managedServiceSelect = {
  _count: {
    select: {
      orders: true
    }
  },
  active: true,
  description: true,
  descriptionEn: true,
  descriptionHi: true,
  id: true,
  priceInr: true,
  priceRub: true,
  priceUnit: true,
  priceUsd: true,
  receiptName: true,
  vatTaxType: true,
  requiresExactParticipantList: true,
  slug: true,
  sortOrder: true,
  title: true,
  titleEn: true,
  titleHi: true,
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
      id: true,
      priceInr: true,
      priceRub: true,
      priceUsd: true,
      sortOrder: true,
      title: true
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

const defaultServiceBySlug = new Map(
  defaultServices.map((service, index) => [
    service.slug,
    {
      ...service,
      sortOrder: index + 1
    }
  ])
);

function toPrismaPriceUnit(priceUnit: SiteService["priceUnit"]) {
  return PrismaPriceUnit[priceUnit];
}

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
    perParticipant: priceUnit === "PER_PARTICIPANT" || priceUnit === "PER_NAME"
  });
}

function toSiteService(
  service: PublicServiceRow,
  localeValue?: string | null
): SiteService {
  const locale = normalizeLocale(localeValue);
  const currency = getCurrencyForLocale(locale);
  const priceAmount = getLocalizedPrice(service, currency);

  return {
    currency,
    description: getLocalizedDescription(service, locale),
    options: service.options.map((option) => {
      const optionPriceAmount = getLocalizedOptionPrice(option, currency);

      return {
        currency,
        description: option.description ?? "",
        id: option.id,
        priceAmount: optionPriceAmount,
        priceLabel: createPriceLabel(
          optionPriceAmount,
          currency,
          "PER_PARTICIPANT"
        ),
        priceRub: option.priceRub,
        title: option.title
      };
    }),
    priceAmount,
    priceLabel: createPriceLabel(priceAmount, currency, service.priceUnit),
    priceRub: service.priceRub,
    priceUnit: service.priceUnit,
    slug: service.slug,
    title: getLocalizedTitle(service, locale)
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
    currency,
    localizedDescription: getLocalizedDescription(service, locale),
    localizedPrice: getLocalizedPrice(service, currency),
    localizedTitle: getLocalizedTitle(service, locale)
  };
}

export async function getPublicServices(
  locale?: string | null
): Promise<SiteServiceList> {
  try {
    const services = await prisma.service.findMany({
      where: {
        active: true
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
      return services.map((service) =>
        toSiteService(service, locale)
      ) as SiteServiceList;
    }
  } catch {
    return defaultServices;
  }

  return defaultServices;
}

export async function getManagedServices(): Promise<ManagedService[]> {
  return prisma.service.findMany({
    orderBy: [
      {
        sortOrder: "asc"
      },
      {
        title: "asc"
      }
    ],
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
      slug: normalizedSlug
    },
    select: orderServiceSelect
  });

  if (service) {
    return withOrderLocale(service, locale);
  }

  const defaultService = defaultServiceBySlug.get(normalizedSlug);

  if (!defaultService) {
    return null;
  }

  const createdService = await prisma.service.upsert({
    where: {
      slug: defaultService.slug
    },
    create: {
      active: true,
      description: defaultService.description,
      priceRub: defaultService.priceRub,
      priceUnit: toPrismaPriceUnit(defaultService.priceUnit),
      receiptName: defaultService.title,
      requiresExactParticipantList: true,
      slug: defaultService.slug,
      sortOrder: defaultService.sortOrder,
      title: defaultService.title,
      vatTaxType: 0
    },
    update: {
      active: true,
      description: defaultService.description,
      priceRub: defaultService.priceRub,
      priceUnit: toPrismaPriceUnit(defaultService.priceUnit),
      receiptName: defaultService.title,
      requiresExactParticipantList: true,
      sortOrder: defaultService.sortOrder,
      title: defaultService.title,
      vatTaxType: 0
    },
    select: orderServiceSelect
  });

  return withOrderLocale(createdService, locale);
}
