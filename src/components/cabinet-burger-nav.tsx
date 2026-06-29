"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";

export function CabinetBurgerNav({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setIsOpen(false), []);

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
        <nav className="cabinet-burger-nav__menu" onClick={close}>
          {children}
        </nav>
      )}
    </div>
  );
}
