"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SalesBadge,
  useUnseenSalesCount
} from "@/components/sales-notifications";

export type AdminNavItem = {
  href: string;
  label: string;
};

export function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();
  const unseenSales = useUnseenSalesCount();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // На телефоне меню раскрывается панелью (AdminNavPanel), а текущий раздел
  // подводим в вид — полезно и на узком рабочем столе, где кнопки переносятся.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center"
    });
  }, [pathname]);

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
            ref={isActive ? activeRef : undefined}
          >
            {item.label}
            {item.href === "/admin/curator-sales" && (
              <SalesBadge count={unseenSales} />
            )}
          </Link>
        );
      })}
    </>
  );
}
