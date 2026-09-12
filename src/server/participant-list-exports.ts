import fs from "node:fs";
import path from "node:path";
import { OrderStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import { prisma } from "@/lib/prisma";
import { formatStatus } from "@/lib/status-labels";

const pdfFontPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "NotoSans-Regular.ttf"
);

/**
 * Шрифт задаём сразу в конструкторе, а не вызовом document.font() после него.
 * Иначе pdfkit успевает подтянуть встроенную Helvetica из своих .afm-файлов, а
 * после сборки Next их по этому пути нет — документ падает ещё до первой буквы.
 * Кириллицу Helvetica всё равно не показывает, так что свой шрифт нужен всегда.
 */
function pdfFontOption() {
  return fs.existsSync(pdfFontPath) ? { font: pdfFontPath } : {};
}

type ExportRow = {
  createdAt: Date;
  curatorName: string;
  customerComment: string;
  customerContacts: string;
  customerName: string;
  eventDate: Date | null;
  listNote: string;
  listStatus: string;
  orderNumber: number;
  participantName: string;
  rowStatus: string;
  selectedOptions: string;
  serviceTitle: string;
  statisticianComment: string;
};

type ExportData = {
  filenameBase: string;
  generatedAt: Date;
  orderNumber: number;
  rows: ExportRow[];
  title: string;
};

function formatDateTime(value: Date) {
  return value.toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Moscow"
  });
}

function formatDate(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
}

function cleanFilenamePart(value: string | number) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getEventDate(list: {
  eventStartsAt: Date | null;
  order: {
    serviceOptions: Array<{ option: { eventStartsAt: Date | null } | null }>;
  };
}) {
  return (
    list.eventStartsAt ??
    list.order.serviceOptions
      .map((option) => option.option?.eventStartsAt ?? null)
      .find((date): date is Date => Boolean(date)) ??
    null
  );
}

function getContacts(order: {
  customerEmail: string | null;
  customerPhone: string | null;
  customerTelegram: string | null;
}) {
  return [order.customerTelegram, order.customerPhone, order.customerEmail]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
}

export async function getParticipantListExportData({
  listId,
  participantIds
}: {
  listId: string;
  participantIds?: string[];
}): Promise<ExportData | null> {
  const list = await prisma.participantList.findUnique({
    where: { id: listId },
    select: {
      eventStartsAt: true,
      note: true,
      serviceTitleOverride: true,
      status: true,
      order: {
        select: {
          createdAt: true,
          curator: { select: { name: true } },
          customerComment: true,
          customerEmail: true,
          customerName: true,
          customerPhone: true,
          customerTelegram: true,
          deletedAt: true,
          orderNumber: true,
          participants: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: {
              fullName: true,
              id: true,
              rowStatus: true,
              statisticianComment: true
            }
          },
          service: { select: { title: true } },
          serviceOptions: {
            orderBy: { sortOrder: "asc" },
            select: {
              option: { select: { eventStartsAt: true } },
              titleSnapshot: true
            }
          },
          status: true
        }
      }
    }
  });

  if (!list || list.order.deletedAt || list.order.status !== OrderStatus.PAID) {
    return null;
  }

  const selectedIdSet = participantIds?.length ? new Set(participantIds) : null;
  const participants = selectedIdSet
    ? list.order.participants.filter((participant) =>
        selectedIdSet.has(participant.id)
      )
    : list.order.participants;
  const serviceTitle =
    list.serviceTitleOverride?.trim() || list.order.service.title;
  const selectedOptions = list.order.serviceOptions
    .map((option) => option.titleSnapshot)
    .join(", ");
  const eventDate = getEventDate(list);
  const rows = participants.map((participant) => ({
    createdAt: list.order.createdAt,
    curatorName: list.order.curator.name,
    customerComment: list.order.customerComment?.trim() || "",
    customerContacts: getContacts(list.order),
    customerName: list.order.customerName,
    eventDate,
    listNote: list.note?.trim() || "",
    listStatus: formatStatus(list.status),
    orderNumber: list.order.orderNumber,
    participantName: participant.fullName,
    rowStatus: formatStatus(participant.rowStatus),
    selectedOptions,
    serviceTitle,
    statisticianComment: participant.statisticianComment?.trim() || ""
  }));

  return {
    filenameBase: `participants-${cleanFilenamePart(list.order.orderNumber)}`,
    generatedAt: new Date(),
    orderNumber: list.order.orderNumber,
    rows,
    title: `Список участников #${list.order.orderNumber}`
  };
}

export async function buildParticipantListXlsx(data: ExportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "StarVedas";
  workbook.created = data.generatedAt;
  workbook.modified = data.generatedAt;

  const worksheet = workbook.addWorksheet("Участники", {
    views: [{ state: "frozen", ySplit: 4 }]
  });

  worksheet.mergeCells("A1:M1");
  worksheet.getCell("A1").value = data.title;
  worksheet.getCell("A1").font = { bold: true, size: 16 };
  worksheet.getCell("A2").value = "Сформировано";
  worksheet.getCell("B2").value = formatDateTime(data.generatedAt);
  worksheet.getCell("A3").value = "Строк в отчёте";
  worksheet.getCell("B3").value = data.rows.length;

  const columns = [
    { header: "Заказ", key: "orderNumber", width: 10 },
    { header: "Дата покупки", key: "createdAt", width: 18 },
    { header: "Куратор", key: "curatorName", width: 24 },
    { header: "Заказчик", key: "customerName", width: 24 },
    { header: "Контакты", key: "customerContacts", width: 34 },
    { header: "Сервис", key: "serviceTitle", width: 28 },
    { header: "Обряды / опции", key: "selectedOptions", width: 30 },
    { header: "Дата начала", key: "eventDate", width: 16 },
    { header: "Имя", key: "participantName", width: 34 },
    { header: "Статус имени", key: "rowStatus", width: 18 },
    { header: "Комментарий статиста", key: "statisticianComment", width: 32 },
    { header: "Пожелания клиента", key: "customerComment", width: 36 },
    { header: "Статус списка", key: "listStatus", width: 18 }
  ];

  worksheet.columns = columns.map(({ key, width }) => ({ key, width }));
  worksheet.getRow(4).values = columns.map((column) => column.header);

  for (const row of data.rows) {
    worksheet.addRow({
      ...row,
      createdAt: formatDateTime(row.createdAt),
      eventDate: formatDate(row.eventDate)
    });
  }

  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    fgColor: { argb: "FF9F6B2D" },
    pattern: "solid",
    type: "pattern"
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 4) {
      return;
    }

    row.eachCell((cell) => {
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        bottom: { color: { argb: "FFEADCC7" }, style: "thin" },
        left: { color: { argb: "FFEADCC7" }, style: "thin" },
        right: { color: { argb: "FFEADCC7" }, style: "thin" },
        top: { color: { argb: "FFEADCC7" }, style: "thin" }
      };
    });
  });

  worksheet.autoFilter = "A4:M4";
  worksheet.pageSetup = {
    fitToPage: true,
    fitToWidth: 1,
    orientation: "landscape",
    paperSize: 9
  };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function collectPdfBuffer(document: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });
}

function ensurePdfSpace(document: PDFKit.PDFDocument, height: number) {
  if (
    document.y + height >
    document.page.height - document.page.margins.bottom
  ) {
    document.addPage();
  }
}

function addPdfMetaLine(
  document: PDFKit.PDFDocument,
  label: string,
  value: string
) {
  document.fontSize(10).fillColor("#6f5940").text(`${label}: `, {
    continued: true
  });
  document.fillColor("#2f2418").text(value || "—");
}

export async function buildParticipantListPdf(data: ExportData) {
  const document = new PDFDocument({
    ...pdfFontOption(),
    margin: 42,
    size: "A4"
  });
  const bufferPromise = collectPdfBuffer(document);

  document.fillColor("#2f2418").fontSize(20).text(data.title, {
    align: "left"
  });
  document.moveDown(0.5);
  addPdfMetaLine(document, "Сформировано", formatDateTime(data.generatedAt));
  addPdfMetaLine(document, "Строк в отчёте", String(data.rows.length));
  document.moveDown();

  if (!data.rows.length) {
    document.fontSize(12).fillColor("#2f2418").text("Нет выбранных имён.");
    document.end();
    return bufferPromise;
  }

  const firstRow = data.rows[0];
  addPdfMetaLine(document, "Заказчик", firstRow.customerName);
  addPdfMetaLine(document, "Контакты", firstRow.customerContacts);
  addPdfMetaLine(document, "Куратор", firstRow.curatorName);
  addPdfMetaLine(document, "Сервис", firstRow.serviceTitle);
  addPdfMetaLine(document, "Обряды / опции", firstRow.selectedOptions);
  addPdfMetaLine(document, "Дата начала", formatDate(firstRow.eventDate));
  if (firstRow.customerComment) {
    addPdfMetaLine(document, "Пожелания клиента", firstRow.customerComment);
  }
  if (firstRow.listNote) {
    addPdfMetaLine(document, "Комментарий к списку", firstRow.listNote);
  }

  document.moveDown();
  document.fontSize(14).fillColor("#2f2418").text("Имена", {
    underline: true
  });
  document.moveDown(0.4);

  const x = document.page.margins.left;
  const widths = [28, 222, 84, 154];
  const headerHeight = 24;

  function drawHeader() {
    ensurePdfSpace(document, headerHeight);
    const y = document.y;
    document
      .rect(
        x,
        y,
        widths.reduce((sum, width) => sum + width, 0),
        headerHeight
      )
      .fill("#9f6b2d");
    document.fillColor("#fffaf3").fontSize(9);
    ["#", "Имя", "Статус", "Комментарий статиста"].forEach((header, index) => {
      document.text(
        header,
        x + widths.slice(0, index).reduce((sum, width) => sum + width, 0) + 5,
        y + 7,
        { width: widths[index] - 10 }
      );
    });
    document.y = y + headerHeight;
  }

  drawHeader();

  data.rows.forEach((row, index) => {
    const values = [
      String(index + 1),
      row.participantName,
      row.rowStatus,
      row.statisticianComment || "—"
    ];
    const heights = values.map((value, columnIndex) =>
      document.heightOfString(value, { width: widths[columnIndex] - 10 })
    );
    const rowHeight = Math.max(26, ...heights.map((height) => height + 12));

    ensurePdfSpace(document, rowHeight + 4);

    if (document.y < 70) {
      drawHeader();
    }

    const y = document.y;
    const fill = index % 2 === 0 ? "#fffaf3" : "#f6f0e8";

    document
      .rect(
        x,
        y,
        widths.reduce((sum, width) => sum + width, 0),
        rowHeight
      )
      .fill(fill);
    document.fillColor("#2f2418").fontSize(9);

    values.forEach((value, columnIndex) => {
      const cellX =
        x + widths.slice(0, columnIndex).reduce((sum, width) => sum + width, 0);
      document
        .strokeColor("#eadcc7")
        .rect(cellX, y, widths[columnIndex], rowHeight)
        .stroke();
      document.fillColor("#2f2418").text(value, cellX + 5, y + 6, {
        width: widths[columnIndex] - 10
      });
    });

    document.y = y + rowHeight;
  });

  const pageCount = document.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i += 1) {
    document.switchToPage(i);
    document
      .fontSize(8)
      .fillColor("#6f5940")
      .text(`StarVedas · страница ${i + 1} из ${pageCount}`, 42, 812, {
        align: "center",
        width: 511
      });
  }

  document.end();
  return bufferPromise;
}
