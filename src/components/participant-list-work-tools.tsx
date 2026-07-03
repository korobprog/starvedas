"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ChangeEvent, FormEvent } from "react";
import {
  bulkProcessParticipantsAction,
  claimParticipantListByCuratorAction
} from "@/server/participant-list-actions";

type ParticipantBulkProcessState = {
  error?: string;
  message?: string;
};

type ParticipantWorkRow = {
  fullName: string;
  id: string;
  rowStatus: string;
};

type ExportFormat = "pdf" | "xlsx";

const initialState: ParticipantBulkProcessState = {};
const initialClaimState: ParticipantBulkProcessState = {};

function createNamesText(rows: ParticipantWorkRow[]) {
  return rows.map((row) => row.fullName).join("\n");
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

function downloadTxt(text: string, filename: string) {
  if (!text) {
    return;
  }

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SubmitButton({
  children,
  intent
}: Readonly<{
  children: string;
  intent: "all" | "selected";
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      className="button button--small"
      disabled={pending}
      name="intent"
      type="submit"
      value={intent}
    >
      {pending ? "Сохраняем…" : children}
    </button>
  );
}

function ClaimSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button button--small" disabled={pending} type="submit">
      {pending ? "Сохраняем…" : "Да, скопировано"}
    </button>
  );
}

export function CuratorParticipantListWorkTools({
  alreadyClaimed,
  listId,
  orderNumber,
  participants
}: Readonly<{
  alreadyClaimed: boolean;
  listId: string;
  orderNumber: number;
  participants: ParticipantWorkRow[];
}>) {
  const [confirming, setConfirming] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [state, formAction] = useActionState(
    claimParticipantListByCuratorAction,
    initialClaimState
  );
  const namesText = createNamesText(participants);

  async function copyAll() {
    await copyText(namesText);
    setClientMessage(`Скопировано имён: ${participants.length}`);
  }

  return (
    <div className="participant-work-tools">
      <div className="admin-muted">
        <strong>Буфер списка:</strong> кнопка «Скопировать имена» только
        копирует текст. Список пропадёт из активного буфера статиста только
        после подтверждения «Да, скопировано».
      </div>

      <div className="participant-tools__actions">
        <button
          className="button button--small"
          onClick={copyAll}
          type="button"
        >
          Скопировать имена
        </button>
        <button
          className="button button--small"
          disabled={alreadyClaimed}
          onClick={() => {
            setClientMessage("");
            setConfirming(true);
          }}
          type="button"
        >
          {alreadyClaimed ? "Уже в работе" : "Скопировал"}
        </button>
      </div>

      {confirming && !alreadyClaimed ? (
        <form action={formAction} className="admin-form">
          <input name="listId" type="hidden" value={listId} />
          <p>
            Вы точно скопировали список #{orderNumber} и берёте его в работу?
          </p>
          <div className="participant-tools__actions">
            <ClaimSubmitButton />
            <button
              className="button button--small"
              onClick={() => setConfirming(false)}
              type="button"
            >
              Отмена
            </button>
          </div>
        </form>
      ) : null}

      {(clientMessage || state.error || state.message) && (
        <p
          aria-live="polite"
          className={state.error ? "form-warning" : "admin-muted"}
        >
          {clientMessage || state.error || state.message}
        </p>
      )}
    </div>
  );
}

export function ParticipantListWorkTools({
  listId,
  orderNumber,
  participants
}: Readonly<{
  listId: string;
  orderNumber: number;
  participants: ParticipantWorkRow[];
}>) {
  const defaultSelectedIds = useMemo(
    () =>
      participants
        .filter((participant) => participant.rowStatus !== "CHECKED")
        .map((participant) => participant.id),
    [participants]
  );
  const [selectedIds, setSelectedIds] = useState(defaultSelectedIds);
  const [clientMessage, setClientMessage] = useState("");
  const [state, formAction] = useActionState(
    bulkProcessParticipantsAction,
    initialState
  );
  const selectedRows = participants.filter((participant) =>
    selectedIds.includes(participant.id)
  );
  const unprocessedCount = participants.filter(
    (participant) => participant.rowStatus !== "CHECKED"
  ).length;
  const allNamesText = createNamesText(participants);
  const selectedNamesText = createNamesText(selectedRows);

  function handleSelectionChange(event: ChangeEvent<HTMLInputElement>) {
    setClientMessage("");

    if (event.target.checked) {
      setSelectedIds((current) =>
        current.includes(event.target.value)
          ? current
          : [...current, event.target.value]
      );
      return;
    }

    setSelectedIds((current) =>
      current.filter((id) => id !== event.target.value)
    );
  }

  function selectAll() {
    setClientMessage("");
    setSelectedIds(participants.map((participant) => participant.id));
  }

  function selectUnprocessed() {
    setClientMessage("");
    setSelectedIds(defaultSelectedIds);
  }

  function clearSelection() {
    setClientMessage("");
    setSelectedIds([]);
  }

  async function copySelected() {
    await copyText(selectedNamesText);
    setClientMessage(`Скопировано имён: ${selectedRows.length}`);
  }

  async function copyAll() {
    await copyText(allNamesText);
    setClientMessage(`Скопировано имён: ${participants.length}`);
  }

  function downloadSelected() {
    downloadTxt(selectedNamesText, `participants-${orderNumber}-selected.txt`);
    setClientMessage(`TXT скачан, имён: ${selectedRows.length}`);
  }

  function downloadAll() {
    downloadTxt(allNamesText, `participants-${orderNumber}.txt`);
    setClientMessage(`TXT скачан, имён: ${participants.length}`);
  }

  function downloadExport(format: ExportFormat, scope: "all" | "selected") {
    setClientMessage("");

    if (scope === "selected" && selectedIds.length === 0) {
      setClientMessage("Выберите хотя бы одно имя для экспорта");
      return;
    }

    const params = new URLSearchParams({ format, listId });

    if (scope === "selected") {
      params.set("participantIds", selectedIds.join(","));
    }

    window.location.assign(
      `/api/participant-lists/export?${params.toString()}`
    );
    setClientMessage(
      `${format.toUpperCase()} готовится к скачиванию, имён: ${
        scope === "selected" ? selectedRows.length : participants.length
      }`
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientMessage("");

    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const intent =
      submitter instanceof HTMLButtonElement ? submitter.value : "selected";

    if (intent === "selected" && selectedIds.length === 0) {
      event.preventDefault();
      setClientMessage("Выберите хотя бы одно имя");
    }
  }

  return (
    <div className="participant-work-tools">
      <div className="admin-muted">
        <strong>Работа с именами:</strong> необработанных {unprocessedCount} из{" "}
        {participants.length}. Копирование ниже берёт только имена, без
        контактов и комментариев. Excel и PDF содержат подробный отчёт.
      </div>

      <div className="participant-tools__actions">
        <button
          className="button button--small"
          onClick={copySelected}
          type="button"
        >
          Скопировать выбранные
        </button>
        <button
          className="button button--small"
          onClick={copyAll}
          type="button"
        >
          Скопировать все
        </button>
        <button
          className="button button--small"
          onClick={downloadSelected}
          type="button"
        >
          TXT выбранные
        </button>
        <button
          className="button button--small"
          onClick={downloadAll}
          type="button"
        >
          TXT все
        </button>
        <button
          className="button button--small"
          onClick={() => downloadExport("xlsx", "selected")}
          type="button"
        >
          Excel выбранные
        </button>
        <button
          className="button button--small"
          onClick={() => downloadExport("xlsx", "all")}
          type="button"
        >
          Excel все
        </button>
        <button
          className="button button--small"
          onClick={() => downloadExport("pdf", "selected")}
          type="button"
        >
          PDF выбранные
        </button>
        <button
          className="button button--small"
          onClick={() => downloadExport("pdf", "all")}
          type="button"
        >
          PDF все
        </button>
        <button
          className="button button--small"
          onClick={selectUnprocessed}
          type="button"
        >
          Выбрать необработанные
        </button>
        <button
          className="button button--small"
          onClick={selectAll}
          type="button"
        >
          Выбрать все
        </button>
        <button
          className="button button--small"
          onClick={clearSelection}
          type="button"
        >
          Снять выбор
        </button>
      </div>

      <form action={formAction} className="admin-form" onSubmit={handleSubmit}>
        <input name="listId" type="hidden" value={listId} />
        <div className="participant-tools__checks">
          {participants.map((participant) => (
            <label className="field field--checkbox" key={participant.id}>
              <input
                checked={selectedIds.includes(participant.id)}
                name="participantIds"
                onChange={handleSelectionChange}
                type="checkbox"
                value={participant.id}
              />
              <span>
                {participant.fullName}
                {participant.rowStatus === "CHECKED" ? " · обработано" : ""}
              </span>
            </label>
          ))}
        </div>
        <div className="participant-tools__actions">
          <SubmitButton intent="selected">
            Отметить выбранные обработанными
          </SubmitButton>
          <SubmitButton intent="all">
            Отметить весь список обработанным
          </SubmitButton>
        </div>
      </form>

      {(clientMessage || state.error || state.message) && (
        <p
          aria-live="polite"
          className={state.error ? "form-warning" : "admin-muted"}
        >
          {clientMessage || state.error || state.message}
        </p>
      )}
    </div>
  );
}
