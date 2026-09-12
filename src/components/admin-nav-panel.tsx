"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { usePathname } from "next/navigation";
import { isActivePath, type AdminNavItem } from "@/components/admin-nav";

const mobileQuery = "(max-width: 860px)";

/**
 * На телефоне разделов слишком много для строки: восемнадцать кнопок занимали
 * полтора экрана. Здесь меню живёт в выездной панели слева — кнопка в шапке
 * открывает её, панель закрывается по фону, Esc и после выбора раздела.
 */
export function AdminNavPanel({
  children,
  items
}: {
  children: ReactNode;
  items: AdminNavItem[];
}) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  // Открытое меню помним вместе с адресом: переход в другой раздел закрывает
  // панель сам, без записи состояния внутри эффекта.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const isOpen = openedAt === pathname;
  const currentLabel =
    items.find((item) => isActivePath(pathname, item.href))?.label ?? "";
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const setIsOpen = useCallback(
    (open: boolean) => {
      setOpenedAt(open ? pathname : null);
    },
    [pathname]
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia(mobileQuery);

    function apply() {
      setIsMobile(media.matches);
    }

    apply();
    media.addEventListener("change", apply);

    return () => media.removeEventListener("change", apply);
  }, []);

  // Закрыть можно клавишей Esc и нажатием вне меню, не только кнопкой.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePointer(event: PointerEvent) {
      const wrapper = wrapperRef.current;

      if (wrapper && !wrapper.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);

    // Пока панель открыта, страница под ней не прокручивается.
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, setIsOpen]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="admin-nav__wrapper" ref={wrapperRef}>
      <button
        aria-controls="admin-nav-drawer"
        aria-expanded={isOpen}
        className="admin-nav__toggle"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span aria-hidden="true" className="admin-nav__burger">
          <span />
          <span />
          <span />
        </span>
        <span className="admin-nav__toggle-text">
          <span className="admin-nav__toggle-hint">Раздел админки</span>
          <strong>{currentLabel || "Выберите раздел"}</strong>
        </span>
      </button>
      <div
        aria-hidden="true"
        className={isOpen ? "admin-nav__overlay is-open" : "admin-nav__overlay"}
        onClick={() => setIsOpen(false)}
      />
      <aside
        aria-label="Разделы админки"
        className={isOpen ? "admin-nav__drawer is-open" : "admin-nav__drawer"}
        id="admin-nav-drawer"
      >
        <div className="admin-nav__drawer-head">
          <strong>Разделы</strong>
          <button
            aria-label="Закрыть меню"
            className="admin-nav__drawer-close"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="admin-nav__list">{children}</div>
      </aside>
    </div>
  );
}
