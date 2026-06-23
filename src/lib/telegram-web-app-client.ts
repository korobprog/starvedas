"use client";

export type TelegramWebApp = {
  expand?: () => void;
  initData?: string;
  ready?: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

let telegramScriptPromise: Promise<void> | null = null;

function getTelegramWebApp() {
  const webApp = window.Telegram?.WebApp;

  return webApp?.initData ? webApp : null;
}

function hasTelegramInitDataInUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );

  return (
    searchParams.has("tgWebAppData") ||
    searchParams.has("tgWebAppStartParam") ||
    hashParams.has("tgWebAppData") ||
    hashParams.has("tgWebAppStartParam")
  );
}

function isLikelyTelegramWebAppContext() {
  return (
    Boolean(window.Telegram?.WebApp) ||
    hasTelegramInitDataInUrl() ||
    /Telegram/i.test(window.navigator.userAgent)
  );
}

function ensureTelegramScript() {
  if (window.Telegram?.WebApp || !isLikelyTelegramWebAppContext()) {
    return Promise.resolve();
  }

  if (telegramScriptPromise) {
    return telegramScriptPromise;
  }

  telegramScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src^="https://telegram.org/js/telegram-web-app.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");

    script.async = true;
    script.src = "https://telegram.org/js/telegram-web-app.js?62";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
    document.head.append(script);
  });

  return telegramScriptPromise;
}

export async function waitForTelegramWebApp(timeoutMs = 3000) {
  await ensureTelegramScript();

  return new Promise<TelegramWebApp | null>((resolve) => {
    const existing = getTelegramWebApp();

    if (existing) {
      resolve(existing);
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const webApp = getTelegramWebApp();

      if (webApp) {
        window.clearInterval(intervalId);
        resolve(webApp);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(intervalId);
        resolve(null);
      }
    }, 80);
  });
}

export function getPublicClientPath(path: string) {
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!publicSiteUrl) {
    return path;
  }

  try {
    const publicOrigin = new URL(publicSiteUrl).origin;
    const publicHost = new URL(publicOrigin).hostname;
    const currentHost = window.location.hostname;
    const currentLooksInternal =
      !currentHost.includes(".") &&
      currentHost !== "localhost" &&
      currentHost !== "127.0.0.1" &&
      currentHost !== "0.0.0.0";
    const publicLooksUsable =
      publicHost.includes(".") &&
      publicHost !== "localhost" &&
      publicHost !== "127.0.0.1";

    if (currentLooksInternal && publicLooksUsable) {
      return new URL(path, publicOrigin).toString();
    }
  } catch {
    // Use the relative path when NEXT_PUBLIC_SITE_URL is not a valid URL.
  }

  return path;
}
