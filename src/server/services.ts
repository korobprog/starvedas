import { PriceUnit as PrismaPriceUnit, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  services as defaultServices,
  type SiteService,
  type SiteServiceList
} from "@/lib/site-data";

const publicServiceSelect = {
  description: true,
  priceRub: true,
  priceUnit: true,
  slug: true,
  title: true
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
  id: true,
  priceRub: true,
  priceUnit: true,
  requiresExactParticipantList: true,
  slug: true,
  sortOrder: true,
  title: true
} satisfies Prisma.ServiceSelect;

type PublicServiceRow = Prisma.ServiceGetPayload<{
  select: typeof publicServiceSelect;
}>;

export type OrderService = Prisma.ServiceGetPayload<{
  select: typeof orderServiceSelect;
}>;

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

function createPriceLabel(
  priceRub: number,
  priceUnit: SiteService["priceUnit"]
) {
  return priceUnit === "PER_NAME"
    ? `${priceRub} руб. за участника`
    : `${priceRub} руб.`;
}

function toSiteService(service: PublicServiceRow): SiteService {
  return {
    description: service.description ?? "",
    priceLabel: createPriceLabel(service.priceRub, service.priceUnit),
    priceRub: service.priceRub,
    priceUnit: service.priceUnit,
    slug: service.slug,
    title: service.title
  };
}

export async function getPublicServices(): Promise<SiteServiceList> {
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
      return services.map(toSiteService) as SiteServiceList;
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
  slug: string
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
    return service;
  }

  const defaultService = defaultServiceBySlug.get(normalizedSlug);

  if (!defaultService) {
    return null;
  }

  return prisma.service.upsert({
    where: {
      slug: defaultService.slug
    },
    create: {
      active: true,
      description: defaultService.description,
      priceRub: defaultService.priceRub,
      priceUnit: toPrismaPriceUnit(defaultService.priceUnit),
      requiresExactParticipantList: true,
      slug: defaultService.slug,
      sortOrder: defaultService.sortOrder,
      title: defaultService.title
    },
    update: {
      active: true,
      description: defaultService.description,
      priceRub: defaultService.priceRub,
      priceUnit: toPrismaPriceUnit(defaultService.priceUnit),
      requiresExactParticipantList: true,
      sortOrder: defaultService.sortOrder,
      title: defaultService.title
    },
    select: orderServiceSelect
  });
}
