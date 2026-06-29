"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/auth";
import {
  captureOrderRevision,
  orderRevisionEventTypes,
  restoreOrderRevision
} from "@/server/order-revisions";

const backupSchema = z.object({
  note: z.string().trim().max(500).optional(),
  orderId: z.string().trim().min(1),
  returnTo: z.string().trim().optional()
});

const restoreSchema = z.object({
  returnTo: z.string().trim().optional(),
  revisionId: z.string().trim().min(1)
});

function getSafeReturnTo(returnTo: string | undefined, fallback: string) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallback;
  }

  return returnTo;
}

function buildRedirectUrl(
  returnTo: string,
  paramsToSet: Record<string, string | undefined>
) {
  const [pathname, query = ""] = returnTo.split("?");
  const params = new URLSearchParams(query);

  for (const [key, value] of Object.entries(paramsToSet)) {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }

  const nextQuery = params.toString();

  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export async function createOrderBackupAction(formData: FormData) {
  const user = await requireAdminUser("/admin/recovery");
  const parsed = backupSchema.safeParse({
    note: formData.get("note") || undefined,
    orderId: formData.get("orderId"),
    returnTo: formData.get("returnTo") || undefined
  });

  const fallbackPath = "/admin/recovery";

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(fallbackPath, {
        backupError: "Некорректные данные резервного копирования"
      })
    );
  }

  const safeReturnTo = getSafeReturnTo(parsed.data.returnTo, fallbackPath);

  try {
    await prisma.$transaction(async (tx) => {
      const createdRevision = await captureOrderRevision(tx, {
        actorUserId: user.id,
        eventType: orderRevisionEventTypes.manualBackup,
        note: parsed.data.note || "Ручной бэкап из кабинета администратора",
        orderId: parsed.data.orderId
      });

      if (!createdRevision) {
        throw new Error("Заказ не найден");
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать резервную копию";

    redirect(
      buildRedirectUrl(safeReturnTo, {
        backupError: message
      })
    );
  }

  redirect(
    buildRedirectUrl(safeReturnTo, {
      backupError: "",
      backupOrder: parsed.data.orderId,
      backupRestored: "",
      backupSaved: "1"
    })
  );
}

export async function restoreOrderRevisionAction(formData: FormData) {
  const user = await requireAdminUser("/admin/recovery");
  const parsed = restoreSchema.safeParse({
    returnTo: formData.get("returnTo") || undefined,
    revisionId: formData.get("revisionId")
  });

  const fallbackPath = "/admin/recovery";

  if (!parsed.success) {
    redirect(
      buildRedirectUrl(fallbackPath, {
        backupError: "Некорректные данные восстановления"
      })
    );
  }

  const safeReturnTo = getSafeReturnTo(parsed.data.returnTo, fallbackPath);

  try {
    const result = await prisma.$transaction((tx) =>
      restoreOrderRevision(tx, {
        actorUserId: user.id,
        revisionId: parsed.data.revisionId
      })
    );

    redirect(
      buildRedirectUrl(safeReturnTo, {
        backupError: "",
        backupOrder: result.orderId,
        backupSaved: "",
        backupRestored: String(result.orderNumber)
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось восстановить заказ";

    redirect(
      buildRedirectUrl(safeReturnTo, {
        backupError: message
      })
    );
  }
}
