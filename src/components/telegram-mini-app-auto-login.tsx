"use client";

import { useEffect, useState } from "react";

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

export function TelegramMiniAppAutoLogin() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;

    if (!webApp?.initData) {
      return;
    }

    let cancelled = false;

    webApp.ready?.();
    webApp.expand?.();

    void fetch("/api/client/telegram-mini-app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        initData: webApp.initData
      })
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Не удалось войти через Telegram");
        }

        window.location.reload();
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return message ? <p className="form-note">{message}</p> : null;
}
