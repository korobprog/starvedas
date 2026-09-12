import { OrderStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";

export type SalesNotificationState = {
  count: number;
  canSee: boolean;
};

const emptyState: SalesNotificationState = { canSee: false, count: 0 };

/**
 * Новая продажа — оплаченный заказ, появившийся позже момента, когда человек
 * последний раз открывал раздел продаж. Куратор видит только свои продажи,
 * администратор — все.
 */
export async function getUnseenSalesState(): Promise<SalesNotificationState> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return emptyState;
    }

    const isAdmin =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.MANAGER;
    const curatorId = user.curator?.id ?? null;

    if (!isAdmin && !curatorId) {
      return emptyState;
    }

    // salesSeenAt не входит в общий select сессии — читаем отдельно.
    const marker = await prisma.user.findUnique({
      select: { salesSeenAt: true },
      where: { id: user.id }
    });
    const seenAt = marker?.salesSeenAt ?? null;

    const count = await prisma.order.count({
      where: {
        deletedAt: null,
        status: OrderStatus.PAID,
        ...(curatorId && !isAdmin ? { curatorId } : {}),
        ...(seenAt ? { updatedAt: { gt: seenAt } } : {})
      }
    });

    return { canSee: true, count };
  } catch {
    // Счётчик — вспомогательная вещь: при сбое просто не показываем цифру.
    return emptyState;
  }
}

export async function markSalesSeen() {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  await prisma.user.update({
    data: { salesSeenAt: new Date() },
    where: { id: user.id }
  });

  return true;
}
