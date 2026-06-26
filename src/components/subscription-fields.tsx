"use client";

import { useState } from "react";

export function SubscriptionFields({
  defaultEndsAt,
  defaultIsSubscription,
  defaultStartsAt,
  onSubscriptionChange
}: Readonly<{
  defaultEndsAt: string;
  defaultIsSubscription: boolean;
  defaultStartsAt: string;
  onSubscriptionChange?: (isSubscription: boolean) => void;
}>) {
  const [isSubscription, setIsSubscription] = useState(defaultIsSubscription);
  function handleSubscriptionChange(value: boolean) {
    setIsSubscription(value);
    onSubscriptionChange?.(value);
  }

  return (
    <section className="admin-list-item">
      <label className="checkbox-field">
        <input
          defaultChecked={defaultIsSubscription}
          name="isSubscription"
          onChange={(event) =>
            handleSubscriptionChange(event.currentTarget.checked)
          }
          type="checkbox"
        />
        <span>Тип продукта: абонемент</span>
      </label>

      {isSubscription && (
        <>
          <div className="field-grid">
            <label className="field">
              <span>Начало действия абонемента (МСК)</span>
              <input
                defaultValue={defaultStartsAt}
                name="subscriptionStartsAt"
                required
                type="datetime-local"
              />
            </label>
            <label className="field">
              <span>Окончание действия абонемента (МСК)</span>
              <input
                defaultValue={defaultEndsAt}
                name="subscriptionEndsAt"
                required
                type="datetime-local"
              />
            </label>
          </div>
          <p className="form-note">
            Этот период будет сохранён в заказе клиента при покупке абонемента.
          </p>
        </>
      )}
    </section>
  );
}
