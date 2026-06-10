"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearAuthSession,
  getDefaultUserPath,
  setAuthSession
} from "@/server/auth";
import { verifyPassword } from "@/server/password";

export type LoginActionState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().trim().email(),
  next: z.string().trim().optional(),
  password: z.string().min(1)
});

function getSafeNext(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  if (next.startsWith("/login")) {
    return fallback;
  }

  return next;
}

export async function loginAction(
  _state: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: "Введите email и пароль" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      active: true,
      id: true,
      passwordHash: true,
      role: true
    }
  });

  if (
    !user?.active ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return { error: "Неверный email или пароль" };
  }

  await setAuthSession(user.id);

  redirect(getSafeNext(parsed.data.next, getDefaultUserPath(user.role)));
}

export async function logoutAction() {
  await clearAuthSession();
  redirect("/login");
}
