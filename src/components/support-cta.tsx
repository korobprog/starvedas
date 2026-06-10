"use client";

import { defaultSupportButtonLabel } from "@/server/support-links";

type SupportCtaProps = {
  className?: string;
  curatorName?: string | null;
  note?: string;
  supportButtonLabel?: string | null;
  supportEnabled?: boolean;
  supportUrl?: string | null;
};

function isWebUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function SupportCta({
  className,
  curatorName,
  note,
  supportButtonLabel,
  supportEnabled = true,
  supportUrl
}: SupportCtaProps) {
  const href = supportEnabled ? supportUrl?.trim() : "";

  if (!href) {
    return null;
  }

  const label = supportButtonLabel?.trim() || defaultSupportButtonLabel;
  const webUrl = isWebUrl(href);
  const classes = ["support-cta", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {note && <p className="support-cta__note">{note}</p>}
      {curatorName && (
        <p className="support-cta__curator">
          Куратор: <strong>{curatorName}</strong>
        </p>
      )}
      <a
        className="button support-cta__button"
        href={href}
        rel={webUrl ? "noreferrer" : undefined}
        target={webUrl ? "_blank" : undefined}
      >
        {label}
      </a>
    </div>
  );
}
