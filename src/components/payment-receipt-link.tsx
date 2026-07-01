"use client";

import { useState } from "react";

type PaymentReceiptLinkProps = {
  label?: string | null;
  url: string;
};

function copyWithTextarea(text: string) {
  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  copyWithTextarea(text);
}

export function PaymentReceiptLink({ label, url }: PaymentReceiptLinkProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const receiptLabel = label?.trim() || "Открыть чек";

  async function copyReceiptUrl() {
    try {
      await copyToClipboard(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    } finally {
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  }

  return (
    <div className="payment-receipt-link">
      <div className="payment-receipt-link__content">
        <span className="payment-receipt-link__title">Чек об оплате</span>
        <a href={url} rel="noreferrer" target="_blank">
          {receiptLabel}
        </a>
      </div>
      <button
        className="button payment-receipt-link__copy"
        onClick={copyReceiptUrl}
        type="button"
      >
        {copyStatus === "copied" ? "Ссылка скопирована" : "Скопировать"}
      </button>
      <span className="payment-receipt-link__status" aria-live="polite">
        {copyStatus === "error"
          ? "Не удалось скопировать автоматически"
          : copyStatus === "copied"
            ? "Можно вставить ссылку в чат или письмо"
            : ""}
      </span>
    </div>
  );
}
