"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPublicClientPath,
  waitForTelegramWebApp
} from "@/lib/telegram-web-app-client";

export function TelegramMiniAppAutoLogin() {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

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

        const clientPath = getPublicClientPath("/client");

        if (clientPath.startsWith("http")) {
          window.location.replace(clientPath);
          return;
        }

        router.refresh();
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMessage(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return message ? <p className="form-note">{message}</p> : null;
}
