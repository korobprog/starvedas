"use client";

import { useState } from "react";
import { getHomeCopy } from "@/i18n/home-copy";

export function SiteNav({ locale }: { locale?: string | null }) {
  const [open, setOpen] = useState(false);
  const copy = getHomeCopy(locale);

  const navLinks = [
    { href: "#services", label: copy.nav.services },
    { href: "#schedule", label: copy.nav.schedule },
    { href: "#signup", label: copy.nav.signup },
    { href: "#faq", label: copy.nav.faq },
    { href: "/articles", label: "Статьи" }
  ] as const;

  return (
    <div className="main-nav-shell">
      <button
        aria-controls="primary-navigation"
        aria-expanded={open}
        aria-label={open ? copy.nav.close : copy.nav.open}
        className="main-nav__toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="main-nav__toggle-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <nav
        aria-label={copy.nav.aria}
        className={open ? "main-nav main-nav--open" : "main-nav"}
        id="primary-navigation"
      >
        {navLinks.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
