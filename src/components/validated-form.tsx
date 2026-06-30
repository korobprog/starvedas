"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

type ValidatedFormProps = Readonly<{
  action: string | ((formData: FormData) => void | Promise<void>);
  children: ReactNode;
  className?: string;
  id?: string;
}>;

export function ValidatedForm({
  action,
  children,
  className,
  id
}: ValidatedFormProps) {
  const handledInvalidRef = useRef(false);

  return (
    <form
      action={action}
      className={className}
      id={id}
      onInvalidCapture={(event) => {
        if (handledInvalidRef.current) {
          return;
        }

        handledInvalidRef.current = true;

        const target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        requestAnimationFrame(() => {
          target.scrollIntoView({
            behavior: getScrollBehavior(),
            block: "center"
          });

          if ("focus" in target) {
            target.focus({ preventScroll: true });
          }
        });
      }}
      onSubmitCapture={() => {
        handledInvalidRef.current = false;
      }}
    >
      {children}
    </form>
  );
}
