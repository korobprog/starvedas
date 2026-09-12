"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  localeCookieName,
  localeLabels,
  locales,
  normalizeLocale,
  type Locale
} from "@/i18n/config";

function setLocaleCookie(locale: Locale) {
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({
  currentLocale
}: {
  currentLocale?: string | null;
}) {
  const router = useRouter();
  const activeLocale = normalizeLocale(currentLocale);

  return (
    <div className="language-switcher" aria-label="Language switcher">
      <ThemeToggle />
      <span aria-hidden="true" className="language-switcher__divider" />
      {locales.map((locale) => (
        <button
          aria-pressed={locale === activeLocale}
          className={
            locale === activeLocale
              ? "language-switcher__button is-active"
              : "language-switcher__button"
          }
          key={locale}
          title={`${localeLabels[locale]} — сменить язык сайта`}
          onClick={() => {
            setLocaleCookie(locale);
            router.refresh();
          }}
          type="button"
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
