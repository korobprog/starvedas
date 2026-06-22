"use client";

import { useActionState } from "react";
import {
  registerClientAction,
  type ClientRegistrationActionState
} from "@/server/client-registration-actions";

const initialState: ClientRegistrationActionState = {};

export function ClientRegistrationForm({
  referralSlug
}: {
  referralSlug?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    registerClientAction,
    initialState
  );

  return (
    <form action={formAction} className="admin-form">
      <input name="phoneCountry" type="hidden" value="RU" />
      <input name="referralSlug" type="hidden" value={referralSlug ?? ""} />

      <label className="field">
        <span>Имя и фамилия</span>
        <input autoComplete="name" name="name" required type="text" />
      </label>

      <label className="field">
        <span>Email для входа</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>

      <label className="field">
        <span>Пароль</span>
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

      <label className="field">
        <span>Telegram</span>
        <input
          autoComplete="off"
          name="telegram"
          placeholder="@username"
          type="text"
        />
      </label>

      <label className="field">
        <span>Телефон</span>
        <input
          autoComplete="tel"
          name="phone"
          placeholder="+7 999 000-00-00"
          type="tel"
        />
      </label>

      <label className="checkbox-field">
        <input name="consentPersonalData" required type="checkbox" />
        <span>
          Я согласен на обработку персональных данных и принимаю документы
          сайта.
        </span>
      </label>

      <label className="checkbox-field">
        <input name="consentMailings" type="checkbox" />
        <span>Хочу получать новости и уведомления о церемониях.</span>
      </label>

      <div className="legal-inline-links" aria-label="Документы регистрации">
        <a href="/legal/personal-data-consent" rel="noreferrer" target="_blank">
          Согласие
        </a>
        <a href="/legal/privacy" rel="noreferrer" target="_blank">
          Политика
        </a>
        <a href="/legal/offer" rel="noreferrer" target="_blank">
          Оферта
        </a>
        <a href="/contacts" rel="noreferrer" target="_blank">
          Контакты
        </a>
      </div>

      {state.error && <p className="form-warning">{state.error}</p>}

      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Регистрируем..." : "Зарегистрироваться"}
      </button>
    </form>
  );
}
