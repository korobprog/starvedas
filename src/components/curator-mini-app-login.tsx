"use client";

import { useEffect, useMemo, useState } from "react";

type TelegramWebApp = {
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

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/cabinet")) {
    return "/cabinet";
  }

  return value;
}

export function CuratorMiniAppLogin({
  nextPath
}: {
  nextPath?: string | null;
}) {
  const [message, setMessage] = useState(
    "Откройте эту страницу из Telegram-бота куратора. Если вы уже внутри Telegram, кабинет откроется автоматически."
  );
  const safeNextPath = useMemo(
    () => getSafeNextPath(nextPath ?? null),
    [nextPath]
  );

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp?.initData) {
      return;
    }

    let cancelled = false;

    webApp.ready?.();
    webApp.expand?.();

    void fetch("/api/curator/telegram-mini-app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        initData: webApp.initData
      })
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message || "Не удалось войти через Telegram");
        }

        window.location.replace(safeNextPath);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [safeNextPath]);

  return <p className="form-note">{message}</p>;
}
