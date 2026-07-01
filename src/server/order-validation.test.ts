import { PriceUnit } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculateOrderAmount,
  createOrderSchema
} from "@/server/order-validation";

const baseOrder = {
  serviceSlug: "shraddha-name",
  selectedServiceOptionIds: [],
  participantCount: 1,
  participantsText: "Штефан Лутенко",
  customerName: "Иван Иванов",
  customerTelegram: "@ivan",
  consentPersonalData: true as const
};

describe("createOrderSchema childRecords", () => {
  it("accepts valid parent name + count rows", () => {
    const result = createOrderSchema.safeParse({
      ...baseOrder,
      childRecords: [
        { type: "UNBORN", parentName: "Лидия Лутенко", childCount: 5 },
        { type: "DECEASED", parentName: "Ираида Иванова", childCount: 4 }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects a single-word parent name", () => {
    const result = createOrderSchema.safeParse({
      ...baseOrder,
      childRecords: [{ type: "UNBORN", parentName: "Лидия", childCount: 5 }]
    });

    expect(result.success).toBe(false);
  });

  it("rejects a zero child count", () => {
    const result = createOrderSchema.safeParse({
      ...baseOrder,
      childRecords: [
        { type: "UNBORN", parentName: "Лидия Лутенко", childCount: 0 }
      ]
    });

    expect(result.success).toBe(false);
  });
});

describe("calculateOrderAmount with childUnits", () => {
  it("adds child units to per-name pricing", () => {
    expect(
      calculateOrderAmount({
        childUnits: 5,
        participantCount: 1,
        participantNames: ["Штефан Лутенко"],
        priceRub: 250,
        priceUnit: PriceUnit.PER_NAME
      })
    ).toBe(250 * 6);
  });

  it("adds child units to per-participant pricing", () => {
    expect(
      calculateOrderAmount({
        childUnits: 3,
        participantCount: 2,
        participantNames: ["A B", "C D"],
        priceRub: 100,
        priceUnit: PriceUnit.PER_PARTICIPANT
      })
    ).toBe(100 * 5);
  });

  it("ignores child units for per-order pricing", () => {
    expect(
      calculateOrderAmount({
        childUnits: 5,
        participantCount: 0,
        participantNames: [],
        priceRub: 1000,
        priceUnit: PriceUnit.PER_ORDER
      })
    ).toBe(1000);
  });
});
