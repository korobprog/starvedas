import { normalizeLocale, type Locale } from "@/i18n/config";

const currencyByLocale: Record<Locale, "RUB" | "USD" | "INR"> = {
  ru: "RUB",
  en: "USD",
  hi: "INR"
};

const rateToRub: Record<"RUB" | "USD" | "INR", number> = {
  RUB: 1,
  USD: 90,
  INR: 1.1
};

const currencyLabels: Record<"RUB" | "USD" | "INR", string> = {
  INR: "₹",
  RUB: "руб.",
  USD: "$"
};

export function getCurrencyForLocale(locale: string | null | undefined) {
  return currencyByLocale[normalizeLocale(locale)];
}

export function formatLocalizedPrice(
  amountRub: number,
  locale: string | null | undefined,
  options?: { perName?: boolean; perParticipant?: boolean }
) {
  const currency = getCurrencyForLocale(locale);
  const amount = amountRub / rateToRub[currency];
  const value = new Intl.NumberFormat(
    currency === "RUB" ? "ru-RU" : currency === "USD" ? "en-US" : "hi-IN",
    {
      maximumFractionDigits: options?.perName ? 0 : 2,
      minimumFractionDigits: 0
    }
  ).format(amount);
  const unitLabel =
    options?.perParticipant && currency === "RUB"
      ? " за участника"
      : options?.perParticipant
        ? " / participant"
        : options?.perName && currency === "RUB"
          ? " за имя"
          : options?.perName
            ? " / name"
            : "";

  return currency === "RUB"
    ? `${value} ${currencyLabels[currency]}${unitLabel}`
    : `${currencyLabels[currency]}${value}${unitLabel}`;
}
