"use client";

import { useActionState } from "react";
import {
  createCuratorAction,
  type CreateCuratorState
} from "@/server/curator-actions";

const initialState: CreateCuratorState = {};

export function CreateCuratorForm() {
  const [state, formAction, pending] = useActionState(
    createCuratorAction,
    initialState
  );
  const referralUrl =
    state.credentials && typeof window !== "undefined"
      ? `${window.location.origin}${state.credentials.referralPath}`
      : state.credentials?.referralPath;

  return (
    <form action={formAction} className="admin-form">
      <label className="field">
        <span>Имя куратора</span>
        <input name="name" required type="text" />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Email для входа</span>
          <input name="email" required type="email" />
        </label>
        <label className="field">
          <span>Slug для ссылки</span>
          <input name="slug" placeholder="jaya-mangal" type="text" />
        </label>
      </div>
      <label className="field">
        <span>Пароль</span>
        <input
          name="password"
          placeholder="Оставьте пустым для генерации"
          type="text"
        />
      </label>
      <label className="field">
        <span>Заголовок после покупки</span>
        <input name="postPurchaseTitle" type="text" />
      </label>
      <label className="field">
        <span>Текст для клиента после покупки</span>
        <textarea name="postPurchaseText" rows={4} />
      </label>
      <label className="field">
        <span>Ссылка для клиента после покупки</span>
        <input
          name="postPurchaseUrl"
          placeholder="https://t.me/..."
          type="url"
        />
      </label>
      <label className="field">
        <span>Кнопка вопроса клиенту</span>
        <input
          name="supportButtonLabel"
          placeholder="Написать вопрос куратору"
          type="text"
        />
      </label>
      <label className="field">
        <span>Адрес для вопросов</span>
        <input
          name="supportUrl"
          placeholder="https://t.me/..., @username, email или телефон"
          type="text"
        />
      </label>
      <label className="checkbox-field">
        <input defaultChecked name="supportEnabled" type="checkbox" />
        <span>Показывать кнопку вопросов клиентам</span>
      </label>
      <label className="checkbox-field">
        <input name="hidden" type="checkbox" />
        <span>Скрыть персональную версию сайта</span>
      </label>
      <label className="checkbox-field">
        <input defaultChecked name="canEditPostPurchase" type="checkbox" />
        <span>Может менять информацию после покупки</span>
      </label>
      <label className="checkbox-field">
        <input defaultChecked name="canEditSupport" type="checkbox" />
        <span>Может менять кнопку поддержки</span>
      </label>
      <label className="checkbox-field">
        <input defaultChecked name="canViewClients" type="checkbox" />
        <span>Может видеть клиентов и покупки</span>
      </label>
      {state.error && <p className="form-warning">{state.error}</p>}
      {state.credentials && (
        <div className="form-result form-result--success">
          <h3>{state.message}</h3>
          <p>
            Логин: <strong>{state.credentials.email}</strong>
          </p>
          <p>
            Пароль: <strong>{state.credentials.password}</strong>
          </p>
          <p>
            Реферальная ссылка: <strong>{referralUrl}</strong>
          </p>
        </div>
      )}
      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Создаем..." : "Создать куратора"}
      </button>
    </form>
  );
}
