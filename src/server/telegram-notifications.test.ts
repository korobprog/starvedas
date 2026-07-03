import { describe, expect, it } from "vitest";
import {
  formatClientParticipantNamesProcessedMessage,
  formatOrderCreatedMessage
} from "@/server/telegram-notifications";

const baseInput = {
  amountRub: 1500,
  curatorName: "Джая Мангал",
  customerEmail: null,
  customerName: "Иван Иванов",
  customerPhone: null,
  customerTelegram: null,
  orderNumber: 42,
  participantCount: 2,
  participantNames: ["Штефан Лутенко", "Василий Лутенко"],
  serviceTitle: "Шраддха ягья"
};

describe("formatOrderCreatedMessage", () => {
  it("includes the children section with statist lines after the participant list", () => {
    const message = formatOrderCreatedMessage({
      ...baseInput,
      childRecordLines: [
        "Нерожденный ребенок Лидия Лутенко 5",
        "Умерший ребенок Ираида Иванова 4"
      ]
    });

    expect(message).toContain("Дети:");
    expect(message).toContain("Нерожденный ребенок Лидия Лутенко 5");
    expect(message).toContain("Умерший ребенок Ираида Иванова 4");
    expect(message.indexOf("Список участников:")).toBeLessThan(
      message.indexOf("Дети:")
    );
  });

  it("omits the children section when there are no child records", () => {
    const message = formatOrderCreatedMessage({
      ...baseInput,
      childRecordLines: []
    });

    expect(message).not.toContain("Дети:");
  });
});

describe("formatClientParticipantNamesProcessedMessage", () => {
  it("includes order details and client cabinet link", () => {
    const message = formatClientParticipantNamesProcessedMessage({
      customerName: "Иван Иванов",
      orderNumber: 42,
      orderUrl: "https://starvedas.ru/client/orders/token",
      participantCount: 2,
      serviceTitle: "Шраддха ягья"
    });

    expect(message).toContain("Имена обработаны");
    expect(message).toContain("Иван Иванов");
    expect(message).toContain("Заказ: #42");
    expect(message).toContain("Шраддха ягья");
    expect(message).toContain("https://starvedas.ru/client/orders/token");
  });
});
