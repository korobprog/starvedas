import { normalizeLocale, type Locale } from "@/i18n/config";

export type Currency = "RUB" | "USD" | "INR";

const currencyByLocale: Record<Locale, Currency> = {
  ru: "RUB",
  en: "USD",
  hi: "INR"
};

const rateToRub: Record<Currency, number> = {
  RUB: 1,
  USD: 90,
  INR: 1.1
};

const currencyLocales: Record<Currency, string> = {
  INR: "hi-IN",
  RUB: "ru-RU",
  USD: "en-US"
};

const currencyLabels: Record<Currency, string> = {
  INR: "₹",
  RUB: "руб.",
  USD: "$"
};

export function getCurrencyForLocale(locale: string | null | undefined) {
  return currencyByLocale[normalizeLocale(locale)];
}

export function convertRubToCurrency(amountRub: number, currency: Currency) {
  return amountRub / rateToRub[currency];
}

export function formatMoney(
  amount: number,
  currency: Currency | string,
  options?: { perName?: boolean; perParticipant?: boolean }
) {
  const normalizedCurrency: Currency =
    currency === "USD" || currency === "INR" || currency === "RUB"
      ? currency
      : "RUB";
  const value = new Intl.NumberFormat(currencyLocales[normalizedCurrency], {
    maximumFractionDigits: options?.perName ? 0 : 2,
    minimumFractionDigits: 0
  }).format(amount);
  const unitLabel =
    options?.perParticipant && normalizedCurrency === "RUB"
      ? " за участника"
      : options?.perParticipant
        ? " / participant"
        : options?.perName && normalizedCurrency === "RUB"
          ? " за имя"
          : options?.perName
            ? " / name"
            : "";

  return normalizedCurrency === "RUB"
    ? `${value} ${currencyLabels[normalizedCurrency]}${unitLabel}`
    : `${currencyLabels[normalizedCurrency]}${value}${unitLabel}`;
}

export function formatLocalizedPrice(
  amountRub: number,
  locale: string | null | undefined,
  options?: { perName?: boolean; perParticipant?: boolean }
) {
  const currency = getCurrencyForLocale(locale);
  const amount = convertRubToCurrency(amountRub, currency);

  return formatMoney(amount, currency, options);
}
