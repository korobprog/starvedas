import { describe, expect, it } from "vitest";
import {
  getVedicGiftThresholdAmount,
  isVedicGiftEligible,
  normalizeVedicGiftThresholdRub
} from "@/lib/vedic-gift";

describe("vedic gift eligibility", () => {
  it("normalizes the default ruble threshold", () => {
    expect(normalizeVedicGiftThresholdRub(null)).toBe(6000);
    expect(normalizeVedicGiftThresholdRub(0)).toBe(1);
  });

  it("converts the ruble threshold to localized currencies", () => {
    expect(getVedicGiftThresholdAmount(6000, "RUB")).toBe(6000);
    expect(getVedicGiftThresholdAmount(6000, "USD")).toBeCloseTo(66.666, 2);
    expect(getVedicGiftThresholdAmount(6000, "INR")).toBeCloseTo(5454.545, 2);
  });

  it("qualifies by service flag or by cart threshold", () => {
    expect(
      isVedicGiftEligible({
        amount: 100,
        currency: "RUB",
        serviceVedicGiftEnabled: true,
        thresholdRub: 6000
      })
    ).toBe(true);
    expect(
      isVedicGiftEligible({
        amount: 5999,
        currency: "RUB",
        thresholdRub: 6000
      })
    ).toBe(false);
    expect(
      isVedicGiftEligible({
        amount: 6000,
        currency: "RUB",
        thresholdRub: 6000
      })
    ).toBe(true);
    expect(
      isVedicGiftEligible({
        amount: 67,
        currency: "USD",
        thresholdRub: 6000
      })
    ).toBe(true);
  });
});
