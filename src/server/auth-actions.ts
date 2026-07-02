"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearAuthSession,
  getDefaultUserPath,
  isAdminRole,
  setAuthSession
} from "@/server/auth";
import { clearClientSession, setClientSession } from "@/server/client-auth";
import { verifyPassword } from "@/server/password";
import { clearStatisticianRole } from "@/server/statistician-role";

export type LoginActionState = {
  error?: string;
};

const loginSchema = z.object({
  email: z.string().trim().email(),
  next: z.string().trim().optional(),
  password: z.string().min(1),
  scope: z.enum(["staff", "client"]).default("staff")
});

function getSafeNext(
  next: string | undefined,
  fallback: string,
  options: { allowedPrefix?: string } = {}
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  if (
    next.startsWith("/login") ||
    next.startsWith("/admin/login") ||
    next.startsWith("/client/login")
  ) {
    return fallback;
  }

  if (options.allowedPrefix && !next.startsWith(options.allowedPrefix)) {
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
    password: formData.get("password"),
    scope: formData.get("scope") || undefined
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
      role: true,
      clientProfile: {
        select: {
          id: true
        }
      }
    }
  });

  if (
    !user?.active ||
    !(await verifyPassword(parsed.data.password, user.passwordHash))
  ) {
    return { error: "Неверный email или пароль" };
  }

  if (parsed.data.scope === "client") {
    if (user.role !== "CLIENT") {
      return {
        error:
          "Это служебный аккаунт. Для админки, куратора или статиста используйте отдельный вход."
      };
    }

    if (!user.clientProfile?.id) {
      return {
        error:
          "Клиентский профиль не найден. Зарегистрируйтесь или обратитесь к администратору."
      };
    }

    await setAuthSession(user.id);
    await setClientSession(user.clientProfile.id);

    redirect(
      getSafeNext(parsed.data.next, "/client", { allowedPrefix: "/client" })
    );
  }

  if (user.role === "CLIENT") {
    return {
      error: "Для клиентского аккаунта используйте вход в личный кабинет."
    };
  }

  await setAuthSession(user.id);
  await clearClientSession();

  const fallback = isAdminRole(user.role)
    ? "/admin/curators"
    : getDefaultUserPath(user.role);
  const staffNext = parsed.data.next?.startsWith("/client")
    ? undefined
    : parsed.data.next;

  redirect(getSafeNext(staffNext, fallback));
}

export async function logoutAction() {
  await clearAuthSession();
  await clearClientSession();
  await clearStatisticianRole();
  redirect("/admin/login");
}
