"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  bulkDeleteCuratorsAction,
  type BulkDeleteCuratorsState
} from "@/server/curator-actions";

const initialState: BulkDeleteCuratorsState = {};

function getSelectedCuratorInputs(form: HTMLFormElement) {
  return Array.from(
    form.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked')
  );
}

export function CuratorBulkDeleteForm({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const [clientError, setClientError] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [state, formAction] = useActionState(
    bulkDeleteCuratorsAction,
    initialState
  );

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.name !== "ids") {
      return;
    }

    setClientError("");
    setSelectedCount(getSelectedCuratorInputs(event.currentTarget).length);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError("");

    const checked = getSelectedCuratorInputs(event.currentTarget);
    setSelectedCount(checked.length);

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
      data-selected-count={selectedCount}
      onChange={handleChange}
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

export function CuratorBulkDeleteSubmitButton({
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
    <button
      className={`${className} curator-bulk-delete-form__submit`}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
