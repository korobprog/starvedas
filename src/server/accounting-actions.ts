"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdminUser } from "@/server/auth";
import {
  accountingSourceDomains,
  syncAccountingReport,
  updateAccountantEmail,
  updateAccountingSpreadsheet
} from "@/server/accounting-reports";

const sourceDomainSchema = z.enum(accountingSourceDomains);

const accountantEmailSchema = z.object({
  accountantEmail: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
    .pipe(z.string().email().nullable()),
  sourceDomain: sourceDomainSchema
});

const spreadsheetSchema = z.object({
  sourceDomain: sourceDomainSchema,
  spreadsheet: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : null))
});

export async function syncAccountingReportAction(formData: FormData) {
  await requireSuperAdminUser("/admin/accounting");

  const parsed = sourceDomainSchema.safeParse(formData.get("sourceDomain"));

  if (!parsed.success) {
    throw new Error("Некорректный сайт для бухгалтерского отчета");
  }

  try {
    await syncAccountingReport(parsed.data);
  } catch {
    // syncAccountingReport already saves the visible error on the report.
  }

  revalidatePath("/admin/accounting");
}

export async function saveAccountantEmailAction(formData: FormData) {
  await requireSuperAdminUser("/admin/accounting");

  const parsed = accountantEmailSchema.safeParse({
    accountantEmail: formData.get("accountantEmail"),
    sourceDomain: formData.get("sourceDomain")
  });

  if (!parsed.success) {
    throw new Error(
      "Введите корректный email бухгалтера или оставьте поле пустым"
    );
  }

  await updateAccountantEmail({
    email: parsed.data.accountantEmail,
    sourceDomain: parsed.data.sourceDomain
  });
  revalidatePath("/admin/accounting");
}

export async function saveAccountingSpreadsheetAction(formData: FormData) {
  await requireSuperAdminUser("/admin/accounting");

  const parsed = spreadsheetSchema.safeParse({
    sourceDomain: formData.get("sourceDomain"),
    spreadsheet: formData.get("spreadsheet")
  });

  if (!parsed.success) {
    throw new Error("Введите корректный сайт и ссылку на Google таблицу");
  }

  await updateAccountingSpreadsheet({
    sourceDomain: parsed.data.sourceDomain,
    spreadsheet: parsed.data.spreadsheet
  });
  revalidatePath("/admin/accounting");
}
