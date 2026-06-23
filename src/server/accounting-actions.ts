"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdminUser } from "@/server/auth";
import {
  accountingSourceDomains,
  syncAccountingReport,
  updateAccountantEmail
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

export async function syncAccountingReportAction(formData: FormData) {
  await requireSuperAdminUser("/admin/accounting");

  const parsed = sourceDomainSchema.safeParse(formData.get("sourceDomain"));

  if (!parsed.success) {
    throw new Error("Некорректный сайт для бухгалтерского отчета");
  }

  await syncAccountingReport(parsed.data);
  revalidatePath("/admin/accounting");
}

export async function saveAccountantEmailAction(formData: FormData) {
  await requireSuperAdminUser("/admin/accounting");

  const parsed = accountantEmailSchema.safeParse({
    accountantEmail: formData.get("accountantEmail"),
    sourceDomain: formData.get("sourceDomain")
  });

  if (!parsed.success) {
    throw new Error("Введите корректный email бухгалтера или оставьте поле пустым");
  }

  await updateAccountantEmail({
    email: parsed.data.accountantEmail,
    sourceDomain: parsed.data.sourceDomain
  });
  revalidatePath("/admin/accounting");
}
