import { prisma } from "@/lib/prisma";

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
