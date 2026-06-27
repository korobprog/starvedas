"use server";

import { redirect } from "next/navigation";
import { clearAuthSession } from "@/server/auth";
import { clearClientSession } from "@/server/client-auth";

export async function clientLogoutAction() {
  await clearAuthSession();
  await clearClientSession();
  redirect("/client");
}
