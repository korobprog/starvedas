"use client";

import { useState } from "react";

export function CopyAccountingLinkButton({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!url) {
    return (
      <button className="button" disabled type="button">
        Скопировать ссылку
      </button>
    );
  }

  return (
    <button
      className="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      type="button"
    >
      {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
    </button>
  );
}
