"use client";

import { useActionState } from "react";
import { CuratorCopyTools } from "@/components/curator-copy-tools";
import { CuratorSlugInput } from "@/components/curator-slug-input";
import {
  updateCuratorAction,
  type UpdateCuratorState
} from "@/server/curator-actions";

type CuratorUpdateFormProps = {
  active: boolean;
  canEditPostPurchase: boolean;
  canEditSupport: boolean;
  canViewClients: boolean;
  email: string;
  fallbackReferral: string;
  hidden: boolean;
  id: string;
  isSystem: boolean;
  name: string;
  origin: string;
  postPurchaseText: string;
  postPurchaseTitle: string;
  postPurchaseUrl: string;
  primaryReferralSlug: string;
  showMailingConsentCheckbox: boolean;
  supportButtonLabel: string;
  supportEnabled: boolean;
  supportUrl: string;
  telegramId: string;
};

const initialState: UpdateCuratorState = {};

export function CuratorUpdateForm({
  active,
  canEditPostPurchase,
  canEditSupport,
  canViewClients,
  email,
  fallbackReferral,
  hidden,
  id,
  isSystem,
  name,
  origin,
  postPurchaseText,
  postPurchaseTitle,
  postPurchaseUrl,
  primaryReferralSlug,
  showMailingConsentCheckbox,
  supportButtonLabel,
  supportEnabled,
  supportUrl,
  telegramId
}: CuratorUpdateFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateCuratorAction,
    initialState
  );

  return (
    <form action={formAction} className="admin-form">
      <input name="id" type="hidden" value={id} />
      <div className="field-grid">
        <label className="field">
          <span>Имя</span>
          <input defaultValue={name} name="name" required type="text" />
        </label>
        <CuratorSlugInput
          defaultName={name}
          defaultSlug={primaryReferralSlug}
          disabled={isSystem}
          label="Slug"
          required
        />
        {isSystem && (
          <input name="slug" type="hidden" value={primaryReferralSlug} />
        )}
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Email</span>
          <input defaultValue={email} name="email" type="email" />
        </label>
        <label className="field">
          <span>Telegram ID куратора</span>
          <input
            defaultValue={telegramId}
            inputMode="numeric"
            name="telegramId"
            placeholder="123456789"
            type="text"
          />
        </label>
        <label className="field">
          <span>Новый пароль</span>
          <input
            name="password"
            placeholder="Заполните только для смены"
            type="text"
          />
        </label>
      </div>

      <label className="field">
        <span>Заголовок после покупки</span>
        <input
          defaultValue={postPurchaseTitle}
          name="postPurchaseTitle"
          type="text"
        />
      </label>
      <label className="field">
        <span>Текст для клиента после покупки</span>
        <textarea
          defaultValue={postPurchaseText}
          name="postPurchaseText"
          rows={4}
        />
      </label>
      <label className="field">
        <span>Ссылка для клиента после покупки</span>
        <input
          defaultValue={postPurchaseUrl}
          name="postPurchaseUrl"
          placeholder="https://t.me/..."
          type="url"
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Кнопка вопроса клиенту</span>
          <input
            defaultValue={supportButtonLabel}
            name="supportButtonLabel"
            placeholder="Написать вопрос куратору"
            type="text"
          />
        </label>
        <label className="field">
          <span>Адрес для вопросов</span>
          <input
            defaultValue={supportUrl}
            name="supportUrl"
            placeholder="https://t.me/..., @username, email или телефон"
            type="text"
          />
        </label>
      </div>

      <div className="checkbox-grid">
        <label className="checkbox-field">
          <input
            defaultChecked={supportEnabled}
            name="supportEnabled"
            type="checkbox"
          />
          <span>Показывать кнопку вопросов клиентам</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={showMailingConsentCheckbox}
            name="showMailingConsentCheckbox"
            type="checkbox"
          />
          <span>Показывать чекбокс согласия на рассылку в форме заявки</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={active}
            disabled={isSystem}
            name="active"
            type="checkbox"
          />
          <span>Активен</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={hidden}
            disabled={isSystem}
            name="hidden"
            type="checkbox"
          />
          <span>Скрыть персональную версию сайта</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={canEditPostPurchase}
            disabled={isSystem}
            name="canEditPostPurchase"
            type="checkbox"
          />
          <span>Может менять информацию после покупки</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={canEditSupport}
            disabled={isSystem}
            name="canEditSupport"
            type="checkbox"
          />
          <span>Может менять кнопку поддержки</span>
        </label>
        <label className="checkbox-field">
          <input
            defaultChecked={canViewClients}
            disabled={isSystem}
            name="canViewClients"
            type="checkbox"
          />
          <span>Может видеть клиентов и покупки</span>
        </label>
      </div>

      {!isSystem && (
        <CuratorCopyTools
          fallbackEmail={email}
          fallbackName={name}
          fallbackReferral={fallbackReferral}
          origin={origin}
        />
      )}

      <div className="form-actions form-actions--static">
        {state.error && <span className="form-warning">{state.error}</span>}
        {state.success && <span className="admin-muted">Данные сохранены</span>}
        <button
          className="button button--primary"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
