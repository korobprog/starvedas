"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  getCuratorAccessStorageKey,
  type CuratorAccessCredentials
} from "@/lib/curator-access-storage";

type CuratorCreatedAccessNoticeProps = {
  curatorId: string;
  curatorName: string;
  origin: string;
};

const fallbackReferralOrigin = "https://chintamanidhama.ru";

function copyWithTextarea(text: string) {
  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      copyWithTextarea(text);
      return;
    }
  }

  copyWithTextarea(text);
}

function getBaseOrigin(origin: string) {
  return (
    process.env.NEXT_PUBLIC_REFERRAL_SITE_URL?.replace(/\/$/, "") ||
    fallbackReferralOrigin ||
    origin.replace(/\/$/, "") ||
    window.location.origin
  );
}

function getReferralUrl(origin: string, referralPath: string) {
  return `${getBaseOrigin(origin)}${referralPath}`;
}

function getCuratorTelegramBotUrl() {
  const botUsername = (
    process.env.NEXT_PUBLIC_CURATOR_TELEGRAM_BOT_USERNAME ?? ""
  )
    .trim()
    .replace(/^@/, "");

  return botUsername ? `https://t.me/${botUsername}` : "";
}

function getTelegramMiniAppInstructions(botUrl: string) {
  return [
    "",
    "Вход через Telegram Mini App:",
    botUrl
      ? `1. Откройте Telegram-бота куратора: ${botUrl}`
      : "1. Откройте Telegram-бота куратора.",
    "2. Нажмите /start.",
    "3. В меню бота нажмите «Открыть кабинет» — кабинет откроется внутри Telegram Mini App.",
    "4. Если бот прислал ваш Telegram ID вместо меню, отправьте этот ID администратору для привязки, затем нажмите /start ещё раз."
  ];
}

function subscribeToStorage() {
  return () => {};
}

function parseStoredCredentials(rawValue: string | null) {
  try {
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<CuratorAccessCredentials>;

    if (!parsed.email || !parsed.password || !parsed.referralPath) {
      return null;
    }

    return {
      email: parsed.email,
      password: parsed.password,
      referralPath: parsed.referralPath
    } satisfies CuratorAccessCredentials;
  } catch {
    return null;
  }
}

function readStorageValue(storageKey: string) {
  try {
    return window.sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function CuratorCreatedAccessNotice({
  curatorId,
  curatorName,
  origin
}: CuratorCreatedAccessNoticeProps) {
  const [copied, setCopied] = useState(false);
  const [dismissedStorageKey, setDismissedStorageKey] = useState<string | null>(
    null
  );
  const storageKey = getCuratorAccessStorageKey(curatorId);
  const storedCredentials = useSyncExternalStore(
    subscribeToStorage,
    () => readStorageValue(storageKey),
    () => null
  );
  const parsedCredentials = useMemo(
    () =>
      dismissedStorageKey === storageKey
        ? null
        : parseStoredCredentials(storedCredentials),
    [dismissedStorageKey, storageKey, storedCredentials]
  );
  const credentialsToShow = parsedCredentials;
  const referralUrl = useMemo(
    () =>
      credentialsToShow
        ? getReferralUrl(origin, credentialsToShow.referralPath)
        : "",
    [credentialsToShow, origin]
  );

  if (!credentialsToShow) {
    return null;
  }

  const currentCredentials = credentialsToShow;

  async function copyAccess() {
    const baseOrigin = getBaseOrigin(origin);
    const botUrl = getCuratorTelegramBotUrl();
    const copyText = [
      `Реферальная ссылка: ${referralUrl}`,
      `Логин: ${currentCredentials.email}`,
      `Пароль: ${currentCredentials.password}`,
      `Имя и фамилия: ${curatorName}`,
      "",
      "Краткая инструкция входа в кабинет куратора:",
      `1. Откройте страницу входа: ${baseOrigin}/login?next=%2Fcabinet`,
      "2. Введите логин и пароль из этого сообщения.",
      `3. После входа перейдите в кабинет: ${baseOrigin}/cabinet`,
      ...getTelegramMiniAppInstructions(botUrl)
    ].join("\n");

    await copyToClipboard(copyText);
    setCopied(true);
  }

  function dismissNotice() {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ничего страшного: блок просто исчезнет в текущем состоянии.
    }

    setDismissedStorageKey(storageKey);
  }

  return (
    <div className="form-result form-result--success curator-access-notice">
      <div>
        <p className="eyebrow">Новый куратор создан</p>
        <h3>Доступы для передачи куратору</h3>
        <p>
          Сохраните пароль сейчас: после закрытия подсказки он больше не будет
          показан в админке.
        </p>
      </div>
      <dl className="details-list">
        <div>
          <dt>Логин</dt>
          <dd>{currentCredentials.email}</dd>
        </div>
        <div>
          <dt>Пароль</dt>
          <dd>{currentCredentials.password}</dd>
        </div>
        <div>
          <dt>Реферальная ссылка</dt>
          <dd>
            <a href={referralUrl} rel="noreferrer" target="_blank">
              {referralUrl}
            </a>
          </dd>
        </div>
      </dl>
      <div className="participant-tools">
        <button className="button" onClick={copyAccess} type="button">
          Копировать доступы
        </button>
        <button className="button" onClick={dismissNotice} type="button">
          Скрыть подсказку
        </button>
        {copied && <span className="admin-muted">Доступы скопированы.</span>}
      </div>
    </div>
  );
}
