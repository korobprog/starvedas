"use client";

import { useState } from "react";

export function SubscriptionFields({
  defaultEndsAt,
  defaultIsSubscription,
  defaultStartsAt
}: Readonly<{
  defaultEndsAt: string;
  defaultIsSubscription: boolean;
  defaultStartsAt: string;
}>) {
  const [isSubscription, setIsSubscription] = useState(defaultIsSubscription);

  return (
    <section className="admin-list-item">
      <label className="checkbox-field">
        <input
          defaultChecked={defaultIsSubscription}
          name="isSubscription"
          onChange={(event) => setIsSubscription(event.currentTarget.checked)}
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
