"use client";

import { useActionState } from "react";
import {
  updateClientOrderAction,
  type ClientOrderEditActionState
} from "@/server/client-order-actions";

const initialState: ClientOrderEditActionState = {};

type ClientOrderEditFormData = {
  customerEmail?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerTelegram?: string | null;
  participantCount: number;
  participantsText: string;
  publicToken: string;
};

export function ClientOrderEditForm({
  order
}: {
  order: ClientOrderEditFormData;
}) {
  const [state, formAction, pending] = useActionState(
    updateClientOrderAction,
    initialState
  );

  return (
    <form action={formAction} className="admin-form">
      <input name="customerPhoneCountry" type="hidden" value="RU" />
      <input name="publicToken" type="hidden" value={order.publicToken} />

      <label className="field">
        <span>Имя и фамилия заказчика</span>
        <input
          autoComplete="name"
          defaultValue={order.customerName}
          name="customerName"
          required
          type="text"
        />
      </label>

      <label className="field">
        <span>Telegram</span>
        <input
          autoComplete="off"
          defaultValue={order.customerTelegram ?? ""}
          name="customerTelegram"
          placeholder="@username"
          type="text"
        />
      </label>

      <label className="field">
        <span>Телефон</span>
        <input
          autoComplete="tel"
          defaultValue={order.customerPhone ?? ""}
          name="customerPhone"
          placeholder="+7 999 000-00-00"
          type="tel"
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          defaultValue={order.customerEmail ?? ""}
          name="customerEmail"
          type="email"
        />
      </label>

      <label className="field field--full">
        <span>Участники — {order.participantCount} строк</span>
        <textarea
          className="participant-textarea"
          defaultValue={order.participantsText}
          name="participantsText"
          required
          rows={Math.max(6, order.participantCount + 2)}
        />
      </label>

      <p className="form-note">
        Сейчас можно менять данные участников без изменения их количества. Если
        нужно добавить или убрать участника, напишите куратору — сумма и ссылка
        на оплату должны быть пересчитаны.
      </p>

      {state.error && <p className="form-warning">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}

      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Сохраняем..." : "Сохранить изменения"}
      </button>
    </form>
  );
}
