"use client";

import { useActionState, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  bulkDeleteCuratorsAction,
  type BulkDeleteCuratorsState
} from "@/server/curator-actions";

const initialState: BulkDeleteCuratorsState = {};

export function CuratorBulkDeleteForm({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const [clientError, setClientError] = useState("");
  const [state, formAction] = useActionState(
    bulkDeleteCuratorsAction,
    initialState
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError("");

    const checked = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[name="ids"]:checked'
      )
    );

    if (checked.length === 0) {
      event.preventDefault();
      setClientError("Выберите хотя бы одного куратора");
      return;
    }

    const confirmed = window.confirm(
      `Удалить полностью выбранных кураторов: ${checked.length}? ` +
        "Будут удалены их заявки, оплаты, списки участников, ссылки и учетные записи. Действие нельзя отменить."
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={formAction}
      className="curator-bulk-delete-form"
      onSubmit={handleSubmit}
    >
      {children}
      {(clientError || state.error || state.message) && (
        <p
          aria-live="polite"
          className={
            clientError || state.error ? "form-warning" : "admin-muted"
          }
        >
          {clientError || state.error || state.message}
        </p>
      )}
    </form>
  );
}
