"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/server/auth";
import {
  acceptStatisticianRole,
  clearStatisticianRole
} from "@/server/statistician-role";

export async function acceptStatisticianRoleAction() {
  await requireAdminUser("/statistician");
  await acceptStatisticianRole();

  redirect("/statistician");
}

export async function leaveStatisticianRoleAction() {
  await requireAdminUser("/admin/statisticians");
  await clearStatisticianRole();

  redirect("/admin/statisticians");
}
