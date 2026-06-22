import { LeadStatus, OrderStatus } from "@prisma/client";

const editableOrderStatuses = new Set<OrderStatus>([
  OrderStatus.DRAFT,
  OrderStatus.PENDING_PAYMENT
]);

const editableLeadStatuses = new Set<LeadStatus>([
  LeadStatus.NEW,
  LeadStatus.WAITING_PAYMENT
]);

export function canClientEditOrderStatus(order: {
  leadStatus: LeadStatus;
  status: OrderStatus;
}) {
  return (
    editableOrderStatuses.has(order.status) &&
    editableLeadStatuses.has(order.leadStatus)
  );
}
