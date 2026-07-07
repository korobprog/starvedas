import { prisma } from "@/lib/prisma";

export const VEDIC_GIFT_AMOUNT_THRESHOLD_RUB = 6000;

export const defaultVedicGiftTitle =
  "🎁 Подарок: ведический астрологический разбор";

export const defaultVedicGiftDescription =
  "Пожалуйста, укажите данные для составления разбора по ведической астрологии (Джйотиш).";

type VedicGiftServiceLike = {
  vedicGiftDescription?: string | null;
  vedicGiftEnabled?: boolean | null;
  vedicGiftTitle?: string | null;
};

type VedicGiftOrderLike = {
  amountRub: number;
  items?: Array<{ service?: VedicGiftServiceLike | null }> | null;
  service?: VedicGiftServiceLike | null;
};

export function getOrderVedicGiftService(order: VedicGiftOrderLike) {
  if (order.service?.vedicGiftEnabled) {
    return order.service;
  }

  return (
    order.items
      ?.map((item) => item.service)
      .find((service) => service?.vedicGiftEnabled) ?? null
  );
}

export function isOrderEligibleForVedicGift(order: VedicGiftOrderLike) {
  return Boolean(
    getOrderVedicGiftService(order) ||
    order.amountRub >= VEDIC_GIFT_AMOUNT_THRESHOLD_RUB
  );
}

export function getOrderVedicGiftTitle(order: VedicGiftOrderLike) {
  return (
    getOrderVedicGiftService(order)?.vedicGiftTitle?.trim() ||
    defaultVedicGiftTitle
  );
}

export function getOrderVedicGiftDescription(order: VedicGiftOrderLike) {
  return (
    getOrderVedicGiftService(order)?.vedicGiftDescription?.trim() ||
    defaultVedicGiftDescription
  );
}

export async function getVedicGiftRequests() {
  return prisma.vedicGiftData.findMany({
    orderBy: [{ processed: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      lastName: true,
      firstName: true,
      email: true,
      birthDate: true,
      birthTime: true,
      birthTimeUnknown: true,
      phone: true,
      telegram: true,
      processed: true,
      createdAt: true,
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          customerTelegram: true,
          curator: { select: { name: true } },
          service: { select: { title: true } }
        }
      }
    }
  });
}

export type VedicGiftRequest = Awaited<
  ReturnType<typeof getVedicGiftRequests>
>[number];
