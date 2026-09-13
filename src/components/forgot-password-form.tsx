"use client";

import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type RequestPasswordResetState
} from "@/server/password-reset-actions";

const initialState: RequestPasswordResetState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  if (state.sent) {
    return (
      <div className="form-success" role="status">
        Если аккаунт с таким email существует, мы отправили на него письмо со
        ссылкой для восстановления пароля. Ссылка действует 1 час. Проверьте
        также папку «Спам».
      </div>
    );
  }

  return (
    <form action={formAction} className="admin-form">
      <label className="field">
        <span>Email</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
      {state.error && <p className="form-warning">{state.error}</p>}
      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Отправляем..." : "Отправить ссылку"}
      </button>
    </form>
  );
}
