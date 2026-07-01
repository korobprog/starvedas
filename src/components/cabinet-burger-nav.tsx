"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from "react";

export function CabinetBurgerNav({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

  const handleMenuClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const target = event.target;

      if (!(target instanceof Element) || !target.closest("a")) {
        return;
      }

      window.setTimeout(close, 0);
    },
    [close]
  );

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  return (
    <div className="cabinet-burger-nav" ref={ref}>
      <button
        type="button"
        className="cabinet-burger-nav__toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Меню"
      >
        <span
          className={
            isOpen
              ? "cabinet-burger-nav__icon cabinet-burger-nav__icon--open"
              : "cabinet-burger-nav__icon"
          }
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </span>
      </button>
      {isOpen && (
        <nav className="cabinet-burger-nav__menu" onClick={handleMenuClick}>
          {children}
        </nav>
      )}
    </div>
  );
}
