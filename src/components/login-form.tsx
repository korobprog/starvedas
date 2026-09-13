"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginActionState } from "@/server/auth-actions";

const initialState: LoginActionState = {};

export function LoginForm({
  next,
  scope = "staff",
  submitLabel = "Войти"
}: {
  next?: string;
  scope?: "staff" | "client";
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <form action={formAction} className="admin-form">
      <input name="next" type="hidden" value={next ?? ""} />
      <input name="scope" type="hidden" value={scope} />
      <label className="field">
        <span>Email</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label className="field">
        <span>Пароль</span>
        <input
          autoComplete="current-password"
          name="password"
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
        {pending ? "Входим..." : submitLabel}
      </button>
      <p className="form-note">
        <Link href={`/forgot-password?scope=${scope}`}>Забыли пароль?</Link>
      </p>
    </form>
  );
}
