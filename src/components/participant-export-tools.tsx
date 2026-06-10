"use client";

import { useMemo, useState } from "react";

export type ParticipantExportRow = {
  contact: string;
  curatorName: string;
  customerName: string;
  date: string;
  fullName: string;
  orderNumber: number;
  paymentStatus: string;
  serviceTitle: string;
};

function escapeCsv(value: string | number) {
  const text = String(value);

  if (!/[",\n;]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function createCsv(rows: ParticipantExportRow[]) {
  const header = [
    "Участник",
    "Церемония",
    "Куратор",
    "Заказ",
    "Клиент",
    "Контакты",
    "Статус оплаты",
    "Дата"
  ];
  const body = rows.map((row) => [
    row.fullName,
    row.serviceTitle,
    row.curatorName,
    row.orderNumber,
    row.customerName,
    row.contact,
    row.paymentStatus,
    row.date
  ]);

  return [header, ...body]
    .map((line) => line.map(escapeCsv).join(";"))
    .join("\n");
}

function createCopyText(rows: ParticipantExportRow[]) {
  return rows
    .map(
      (row) =>
        `${row.fullName}\t${row.serviceTitle}\t${row.curatorName}\t#${row.orderNumber}\t${row.contact}`
    )
    .join("\n");
}

export function ParticipantExportTools({
  rows
}: {
  rows: ParticipantExportRow[];
}) {
  const [status, setStatus] = useState("");
  const csv = useMemo(() => createCsv(rows), [rows]);
  const copyText = useMemo(() => createCopyText(rows), [rows]);

  async function copyParticipants() {
    if (!copyText) {
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(copyText);
    } else {
      const textarea = document.createElement("textarea");

      textarea.value = copyText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setStatus("Список скопирован");
  }

  function downloadCsv() {
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "participants.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("CSV выгружен");
  }

  return (
    <div className="participant-tools">
      <button
        className="button"
        disabled={rows.length === 0}
        onClick={copyParticipants}
        type="button"
      >
        Скопировать список
      </button>
      <button
        className="button"
        disabled={rows.length === 0}
        onClick={downloadCsv}
        type="button"
      >
        Скачать CSV
      </button>
      {status && <span className="admin-muted">{status}</span>}
    </div>
  );
}
