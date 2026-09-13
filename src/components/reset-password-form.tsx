"use client";

import { useActionState } from "react";
import {
  resetPasswordAction,
  type ResetPasswordState
} from "@/server/password-reset-actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState
  );

  return (
    <form action={formAction} className="admin-form">
      <input name="token" type="hidden" value={token} />
      <label className="field">
        <span>Новый пароль</span>
        <input
          autoComplete="new-password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </label>
      <label className="field">
        <span>Повторите пароль</span>
        <input
          autoComplete="new-password"
          minLength={8}
          name="passwordConfirm"
          required
          type="password"
        />
      </label>
      {state.error && <p className="form-warning">{state.error}</p>}
      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Сохраняем..." : "Сохранить пароль"}
      </button>
    </form>
  );
}
