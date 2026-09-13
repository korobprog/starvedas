"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clearAuthSession } from "@/server/auth";
import { clearClientSession } from "@/server/client-auth";
import {
  resetPasswordWithToken,
  sendPasswordResetLink
} from "@/server/password-reset";
import { minPasswordLength } from "@/server/password-reset-token";

export type RequestPasswordResetState = {
  error?: string;
  sent?: boolean;
};

export type ResetPasswordState = {
  error?: string;
};

const requestSchema = z.object({
  email: z.string().trim().email()
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(
        minPasswordLength,
        `Пароль должен быть не короче ${minPasswordLength} символов`
      ),
    passwordConfirm: z.string().min(1, "Повторите пароль"),
    token: z.string().trim().min(1)
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Пароли не совпадают",
    path: ["passwordConfirm"]
  });

export async function requestPasswordResetAction(
  _state: RequestPasswordResetState,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: "Введите корректный email" };
  }

  // Поиск и отправка идут после ответа: время ответа и текст одинаковы
  // для существующих и несуществующих адресов.
  after(async () => {
    try {
      await sendPasswordResetLink(parsed.data.email);
    } catch {
      console.error("Password reset email failed");
    }
  });

  return { sent: true };
}

export async function resetPasswordAction(
  _state: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    token: formData.get("token")
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Проверьте введённые данные"
    };
  }

  const result = await resetPasswordWithToken(
    parsed.data.token,
    parsed.data.password
  );

  if (!result) {
    return {
      error: "Ссылка недействительна или устарела. Запросите новую."
    };
  }

  await clearAuthSession();
  await clearClientSession();

  redirect(
    result.role === "CLIENT" ? "/client/login?reset=1" : "/admin/login?reset=1"
  );
}
