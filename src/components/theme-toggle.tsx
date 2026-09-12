"use client";

import { useCallback, useSyncExternalStore } from "react";

export const themeStorageKey = "starvedas-theme";

const themeChangeEvent = "starvedas-theme-change";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Тема живёт вне React: её ставит скрипт в layout до первой отрисовки и хранит
 * localStorage. Поэтому читаем её подпиской на внешнее состояние, а не через
 * состояние компонента.
 */
function subscribe(onChange: () => void) {
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", onChange);
  media?.addEventListener("change", onChange);

  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", onChange);
    media?.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const stamped = document.documentElement.getAttribute("data-theme");

  if (stamped === "dark" || stamped === "light") {
    return stamped;
  }

  return systemTheme();
}

function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const switchTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", next);

    try {
      window.localStorage.setItem(themeStorageKey, next);
    } catch {
      // Выбор не сохранится, но тема всё равно переключится.
    }

    window.dispatchEvent(new Event(themeChangeEvent));
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      className="language-switcher__button theme-toggle"
      onClick={switchTheme}
      title={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      type="button"
    >
      {isDark ? (
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <circle cx="10" cy="10" fill="currentColor" r="3.6" />
          <path
            d="M10 1.5v2.2M10 16.3v2.2M1.5 10h2.2M16.3 10h2.2M4 4l1.6 1.6M14.4 14.4 16 16M16 4l-1.6 1.6M5.6 14.4 4 16"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path
            d="M15.8 12.6A6.6 6.6 0 0 1 7.4 4.2a6.6 6.6 0 1 0 8.4 8.4z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  );
}
