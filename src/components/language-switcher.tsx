"use client";

import { useRouter } from "next/navigation";
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
      {locales.map((locale) => (
        <button
          className={
            locale === activeLocale
              ? "language-switcher__button is-active"
              : "language-switcher__button"
          }
          key={locale}
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
