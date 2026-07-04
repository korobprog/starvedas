"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { bulkProcessParticipantListsAction } from "@/server/participant-list-actions";

type BulkCopyState = {
  error?: string;
  message?: string;
};

export type StatisticianBulkCopyItem = {
  dateLabel: string;
  listId: string;
  names: string[];
  title: string;
};

const initialState: BulkCopyState = {};

function createBulkText(items: StatisticianBulkCopyItem[]) {
  return items
    .map((item) => [item.title, item.dateLabel, ...item.names].join("\n"))
    .join("\n\n");
}

async function copyText(text: string) {
  if (!text) {
    return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function ConfirmButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--primary" disabled={pending} type="submit">
      {pending ? "Сохраняем…" : "Подтверждаю, скопировал"}
    </button>
  );
}

export function StatisticianBulkCopyPanel({
  items
}: Readonly<{
  items: StatisticianBulkCopyItem[];
}>) {
  const router = useRouter();
  const [readyToConfirm, setReadyToConfirm] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [state, formAction] = useActionState(
    bulkProcessParticipantListsAction,
    initialState
  );
  const text = useMemo(() => createBulkText(items), [items]);
  const namesCount = items.reduce((sum, item) => sum + item.names.length, 0);

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [router, state.message]);

  async function copyAll() {
    await copyText(text);
    setReadyToConfirm(true);
    setClientMessage(
      `Скопировано списков: ${items.length}, имён: ${namesCount}`
    );
  }

  return (
    <section className="admin-card admin-card--wide participant-bulk-copy">
      <div className="section-heading section-heading--compact">
        <p className="eyebrow">Буфер для статиста</p>
        <h2>Все необработанные имена одним текстом</h2>
        <p>
          Текст уже собран в формате «Название продукта / Дата / Имена». Можно
          скопировать кнопкой или выделить текст вручную в большом поле.
        </p>
      </div>

      <label className="field">
        <span>
          Необработанные списки: {items.length}, имён: {namesCount}
        </span>
        <textarea
          className="participant-bulk-copy__textarea"
          readOnly
          rows={16}
          value={text}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>

      <div className="participant-tools__actions">
        <button
          className="button button--primary"
          onClick={copyAll}
          type="button"
        >
          Скопировать весь текст
        </button>
        <button
          className="button"
          onClick={() => {
            setReadyToConfirm(true);
            setClientMessage("Ок, можно подтверждать ручное копирование.");
          }}
          type="button"
        >
          Я скопировал вручную
        </button>
      </div>

      {readyToConfirm ? (
        <form action={formAction} className="admin-form">
          {items.map((item) => (
            <input
              key={item.listId}
              name="listIds"
              type="hidden"
              value={item.listId}
            />
          ))}
          <p className="admin-muted">
            После подтверждения эти карточки уйдут из необработанных в
            «Обработанные / архив».
          </p>
          <ConfirmButton />
        </form>
      ) : null}

      {(state.error || state.message || clientMessage) && (
        <p
          aria-live="polite"
          className={state.error ? "form-warning" : "admin-muted"}
        >
          {state.error || state.message || clientMessage}
        </p>
      )}
    </section>
  );
}
