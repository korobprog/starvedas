"use client";

import { useEffect, useState } from "react";
import {
  getPublicClientPath,
  waitForTelegramWebApp
} from "@/lib/telegram-web-app-client";

export function TelegramMiniAppAutoLogin() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    void waitForTelegramWebApp()
      .then(async (webApp) => {
        if (!webApp || cancelled) {
          return;
        }

        webApp.ready?.();
        webApp.expand?.();

        const response = await fetch("/api/client/telegram-mini-app", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            initData: webApp.initData
          })
        });

        if (!response.ok) {
          throw new Error("Не удалось войти через Telegram");
        }

        window.location.replace(getPublicClientPath("/client"));
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
