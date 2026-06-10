export function formatStatus(status: string) {
  const labels: Record<string, string> = {
    AWAITING_VERIFICATION: "ожидает проверки оплаты",
    CANCELLED: "отменен",
    BOUGHT: "купил",
    COMPLETED: "завершен",
    DID_NOT_BUY: "не купил",
    DRAFT: "черновик",
    FAILED: "ошибка оплаты",
    IN_WORK: "в работе",
    NEW: "новая заявка",
    PAID: "оплачен",
    PENDING: "ожидает оплаты",
    PENDING_PAYMENT: "ожидает оплаты",
    REFUNDED: "возвращен",
    SUCCEEDED: "оплачен",
    STARTED_CHECKOUT: "начал оформление",
    VISITED: "посетил",
    WAITING_CLIENT: "ждем клиента",
    WAITING_PAYMENT: "ждем оплату",
    WAITING_PAYMENT_VERIFICATION: "ожидает проверки оплаты"
  };

  return labels[status] ?? status;
}
