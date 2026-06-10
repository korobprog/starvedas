import { paymentMethods, type PaymentMethodInfo } from "@/lib/legal-content";
import { prisma } from "@/lib/prisma";

const fallbackByCode = new Map(
  paymentMethods.map((method) => [method.code, method])
);

export async function getActivePaymentMethods(): Promise<PaymentMethodInfo[]> {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        code: true,
        description: true,
        logoUrl: true,
        name: true
      }
    });

    if (methods.length === 0) {
      return paymentMethods;
    }

    return methods.map((method) => {
      const fallback = fallbackByCode.get(method.code);

      return {
        code: method.code,
        description:
          method.description || fallback?.description || "Способ оплаты.",
        logoText: fallback?.logoText || method.name,
        logoUrl: method.logoUrl || fallback?.logoUrl,
        name: method.name || fallback?.name || method.code
      };
    });
  } catch {
    return paymentMethods;
  }
}
