"use client";

import { useState } from "react";

type ReferralLinkToolsProps = {
  displayValue: string;
  href: string;
};

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

export function ReferralLinkTools({
  displayValue,
  href
}: ReferralLinkToolsProps) {
  const [copied, setCopied] = useState(false);

  async function copyReferral() {
    await copyToClipboard(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="referral-cell">
      <a
        className="referral-cell__link"
        href={href}
        rel="noreferrer"
        target="_blank"
        title={href}
      >
        {displayValue}
      </a>
      <div className="referral-cell__actions">
        <button
          aria-label="Скопировать реферальную ссылку"
          className="icon-button"
          onClick={copyReferral}
          title={copied ? "Скопировано" : "Скопировать ссылку"}
          type="button"
        >
          {copied ? "✓" : "⧉"}
        </button>
        <a
          aria-label="Открыть реферальную ссылку"
          className="icon-button"
          href={href}
          rel="noreferrer"
          target="_blank"
          title="Открыть ссылку"
        >
          ↗
        </a>
      </div>
    </div>
  );
}
