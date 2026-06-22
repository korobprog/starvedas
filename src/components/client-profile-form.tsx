"use client";

import { useActionState } from "react";
import {
  updateClientProfileAction,
  type ClientProfileActionState
} from "@/server/client-profile-actions";

const initialState: ClientProfileActionState = {};

type ClientProfileFormData = {
  consentMailings: boolean;
  email?: string | null;
  name: string;
  phone?: string | null;
  telegram?: string | null;
};

export function ClientProfileForm({
  client
}: {
  client: ClientProfileFormData;
}) {
  const [state, formAction, pending] = useActionState(
    updateClientProfileAction,
    initialState
  );

  return (
    <form action={formAction} className="admin-form">
      <input name="phoneCountry" type="hidden" value="RU" />

      <label className="field">
        <span>Имя и фамилия</span>
        <input
          autoComplete="name"
          defaultValue={client.name}
          name="name"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Email для входа и уведомлений</span>
        <input
          autoComplete="email"
          defaultValue={client.email ?? ""}
          name="email"
          required
          type="email"
        />
      </label>

      <label className="field">
        <span>Telegram</span>
        <input
          autoComplete="off"
          defaultValue={client.telegram ?? ""}
          name="telegram"
          placeholder="@username"
          type="text"
        />
      </label>

      <label className="field">
        <span>Телефон</span>
        <input
          autoComplete="tel"
          defaultValue={client.phone ?? ""}
          name="phone"
          placeholder="+7 999 000-00-00"
          type="tel"
        />
      </label>

      <label className="checkbox-field">
        <input
          defaultChecked={client.consentMailings}
          name="consentMailings"
          type="checkbox"
        />
        <span>Получать новости и уведомления о церемониях.</span>
      </label>

      {state.error && <p className="form-warning">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}

      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Сохраняем..." : "Сохранить профиль"}
      </button>
    </form>
  );
}
