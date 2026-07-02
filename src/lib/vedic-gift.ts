import {
  convertRubToCurrency,
  formatMoney,
  type Currency
} from "@/i18n/pricing";

export const defaultVedicGiftThresholdRub = 6000;

export const defaultVedicGiftTitle =
  "🎁 Подарок: ведический астрологический разбор";

export const defaultVedicGiftDescription =
  "Пожалуйста, укажите данные для составления разбора по ведической астрологии (Джйотиш).";

export function normalizeVedicGiftThresholdRub(thresholdRub?: number | null) {
  return Math.max(1, Math.round(thresholdRub ?? defaultVedicGiftThresholdRub));
}

export function getVedicGiftThresholdAmount(
  thresholdRub: number | null | undefined,
  currency: Currency | string
) {
  const normalizedCurrency: Currency =
    currency === "USD" || currency === "INR" || currency === "RUB"
      ? currency
      : "RUB";

  return convertRubToCurrency(
    normalizeVedicGiftThresholdRub(thresholdRub),
    normalizedCurrency
  );
}

export function isVedicGiftEligible({
  amount,
  currency,
  serviceVedicGiftEnabled,
  thresholdRub
}: {
  amount: number;
  currency: Currency | string;
  serviceVedicGiftEnabled?: boolean;
  thresholdRub?: number | null;
}) {
  if (serviceVedicGiftEnabled) {
    return true;
  }

  return amount >= getVedicGiftThresholdAmount(thresholdRub, currency);
}

export function formatVedicGiftThreshold(
  thresholdRub: number | null | undefined,
  currency: Currency | string
) {
  return formatMoney(
    getVedicGiftThresholdAmount(thresholdRub, currency),
    currency
  );
}
