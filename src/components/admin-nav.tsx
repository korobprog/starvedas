"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? "button button--active" : "button"}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
