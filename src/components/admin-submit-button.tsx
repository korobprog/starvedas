"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function AdminSubmitButton({
  children,
  className = "button",
  pendingLabel = "Сохраняем…"
}: Readonly<{
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}
