export const fallbackLocale = "ru";
export const localeCookieName = "starvedas-locale";

export const locales = ["ru", "en", "hi"] as const;

export type Locale = (typeof locales)[number];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ru: "Русский"
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return locales.find((locale) => locale === value) ?? fallbackLocale;
}
