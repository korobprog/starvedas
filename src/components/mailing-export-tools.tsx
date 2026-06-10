"use client";

import { useMemo, useState } from "react";

export type MailingExportRow = {
  contact: string;
  curatorName: string;
  email: string;
  name: string;
  phone: string;
  status: string;
  telegram: string;
};

function escapeCsv(value: string | number) {
  const text = String(value);

  if (!/[",\n;]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function createCsv(rows: MailingExportRow[]) {
  const header = [
    "Клиент",
    "Telegram",
    "Телефон",
    "Email",
    "Контакт",
    "Статус",
    "Куратор"
  ];
  const body = rows.map((row) => [
    row.name,
    row.telegram,
    row.phone,
    row.email,
    row.contact,
    row.status,
    row.curatorName
  ]);

  return [header, ...body]
    .map((line) => line.map(escapeCsv).join(";"))
    .join("\n");
}

function createCopyText(rows: MailingExportRow[]) {
  return rows
    .map(
      (row) => `${row.name}\t${row.contact}\t${row.status}\t${row.curatorName}`
    )
    .join("\n");
}

export function MailingExportTools({ rows }: { rows: MailingExportRow[] }) {
  const [status, setStatus] = useState("");
  const csv = useMemo(() => createCsv(rows), [rows]);
  const copyText = useMemo(() => createCopyText(rows), [rows]);

  async function copyContacts() {
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

    setStatus("Контакты скопированы");
  }

  function downloadCsv() {
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "mailing-clients.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("CSV для рассылки выгружен");
  }

  return (
    <div className="participant-tools">
      <button
        className="button"
        disabled={rows.length === 0}
        onClick={copyContacts}
        type="button"
      >
        Скопировать контакты для рассылки
      </button>
      <button
        className="button"
        disabled={rows.length === 0}
        onClick={downloadCsv}
        type="button"
      >
        Скачать CSV для рассылки
      </button>
      {status && <span className="admin-muted">{status}</span>}
    </div>
  );
}
