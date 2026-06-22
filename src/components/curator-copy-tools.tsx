"use client";

import { useState, type MouseEvent } from "react";

type CuratorCopyToolsProps = {
  fallbackEmail: string;
  fallbackName: string;
  fallbackReferral: string;
  origin: string;
};

type CopyStatus = {
  message: string;
  type: "error" | "success";
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

function getFormValue(form: HTMLFormElement, name: string, fallback = "") {
  const value = new FormData(form).get(name);

  return (typeof value === "string" ? value.trim() : "") || fallback;
}

function getBaseOrigin(origin: string) {
  return origin.replace(/\/$/, "") || window.location.origin;
}

function getReferralOrigin() {
  return (
    process.env.NEXT_PUBLIC_REFERRAL_SITE_URL?.replace(/\/$/, "") ||
    fallbackReferralOrigin
  );
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

function buildReferralUrl(
  origin: string,
  slug: string,
  fallbackReferral: string
) {
  if (!slug) {
    return fallbackReferral;
  }

  return `${getReferralOrigin()}/r/${encodeURIComponent(slug)}`;
}

export function CuratorCopyTools({
  fallbackEmail,
  fallbackName,
  fallbackReferral,
  origin
}: CuratorCopyToolsProps) {
  const [status, setStatus] = useState<CopyStatus | null>(null);

  async function copyCuratorAccess(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    const email = getFormValue(form, "email", fallbackEmail);
    const name = getFormValue(form, "name", fallbackName);
    const password = getFormValue(form, "password");
    const referral = buildReferralUrl(
      origin,
      getFormValue(form, "slug"),
      fallbackReferral
    );
    const missingFields = [
      !name ? "имя и фамилию" : "",
      !email ? "email" : ""
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setStatus({
        message: `Заполните ${missingFields.join(", ")}, чтобы скопировать доступ.`,
        type: "error"
      });
      return;
    }

    const baseOrigin = getBaseOrigin(origin);
    const loginUrl = `${baseOrigin}/login?next=%2Fcabinet`;
    const cabinetUrl = `${baseOrigin}/cabinet`;
    const botUrl = getCuratorTelegramBotUrl();
    const copyText = [
      `Реферальная ссылка: ${referral}`,
      `Логин: ${email}`,
      ...(password ? [`Пароль: ${password}`] : []),
      `Имя и фамилия: ${name}`,
      "",
      "Краткая инструкция входа в кабинет куратора:",
      `1. Откройте страницу входа: ${loginUrl}`,
      "2. Введите логин и пароль из этого сообщения.",
      `3. После входа перейдите в кабинет: ${cabinetUrl}`,
      ...getTelegramMiniAppInstructions(botUrl)
    ].join("\n");

    await copyToClipboard(copyText);
    setStatus({
      message:
        "Доступ скопирован. Нажмите «Сохранить», чтобы пароль начал действовать.",
      type: "success"
    });
  }

  return (
    <div className="participant-tools">
      <button className="button" onClick={copyCuratorAccess} type="button">
        Копировать все
      </button>
      {status && (
        <span
          className={status.type === "error" ? "form-warning" : "admin-muted"}
        >
          {status.message}
        </span>
      )}
    </div>
  );
}
