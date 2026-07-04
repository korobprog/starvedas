"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getPublicClientPath,
  waitForTelegramWebApp
} from "@/lib/telegram-web-app-client";

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/cabinet")) {
    return "/cabinet";
  }

  return value;
}

function getTelegramStartParam(initData?: string) {
  if (!initData) {
    return "";
  }

  return new URLSearchParams(initData).get("start_param")?.trim() ?? "";
}

export function CuratorMiniAppLogin({
  nextPath
}: {
  nextPath?: string | null;
}) {
  const [message, setMessage] = useState(
    "Откройте эту страницу из Telegram-бота. Если вы уже внутри Telegram, кабинет откроется автоматически."
  );
  const [entryMode, setEntryMode] = useState<"client" | "curator" | "unknown">(
    "unknown"
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
          if (!cancelled) {
            setEntryMode("curator");
          }
          return null;
        }

        webApp.ready?.();
        webApp.expand?.();

        const referralSlug = getTelegramStartParam(webApp.initData);
        const isReferralClientEntry = Boolean(referralSlug);
        const endpoint = isReferralClientEntry
          ? "/api/client/telegram-mini-app"
          : "/api/curator/telegram-mini-app";

        if (isReferralClientEntry && !cancelled) {
          setEntryMode("client");
          setMessage("Открываем клиентский кабинет по реферальной ссылке...");
        } else if (!cancelled) {
          setEntryMode("curator");
        }

        return fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            initData: webApp.initData,
            referralSlug
          })
        }).then((response) => ({
          isReferralClientEntry,
          response
        }));
      })
      .then(async (result) => {
        if (!result) {
          return;
        }
        const { isReferralClientEntry, response } = result;
        const responseBody = (await response.json().catch(() => ({}))) as {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            responseBody.message || "Не удалось войти через Telegram"
          );
        }

        window.location.replace(
          getPublicClientPath(isReferralClientEntry ? "/client" : safeNextPath)
        );
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

  return (
    <>
      <p className="form-note">{message}</p>
      {entryMode === "curator" && (
        <Link className="button" href="/admin/login?next=%2Fcabinet">
          Войти по email и паролю
        </Link>
      )}
      {entryMode === "client" && (
        <div className="form-actions">
          <Link
            className="button button--primary"
            href="/client/login?next=%2Fclient"
          >
            Войти в личный кабинет
          </Link>
          <Link className="button" href="/#signup">
            Перейти к форме записи
          </Link>
        </div>
      )}
    </>
  );
}
