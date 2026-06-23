"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPublicClientPath,
  waitForTelegramWebApp
} from "@/lib/telegram-web-app-client";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/statistician")) {
    return "/statistician";
  }

  return value;
}

export function StatisticianMiniAppLogin({
  nextPath
}: {
  nextPath?: string | null;
}) {
  const [message, setMessage] = useState(
    "Откройте эту страницу из Telegram-бота. Если вы уже внутри Telegram, кабинет статиста откроется автоматически."
  );
  const safeNextPath = useMemo(
    () => getSafeNextPath(nextPath ?? null),
    [nextPath]
  );

  useEffect(() => {
    let cancelled = false;

    void waitForTelegramWebApp()
      .then(async (webApp) => {
        if (!webApp || cancelled) {
          return null;
        }

        webApp.ready?.();
        webApp.expand?.();

        return fetch("/api/statistician/telegram-mini-app", {
          body: JSON.stringify({
            initData: webApp.initData
          }),
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });
      })
      .then(async (response) => {
        if (!response) {
          return;
        }
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message || "Не удалось войти через Telegram");
        }

        window.location.replace(getPublicClientPath(safeNextPath));
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
