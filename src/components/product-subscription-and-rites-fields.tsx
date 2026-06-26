"use client";

import { useState } from "react";
import {
  RiteOptionsFields,
  type RiteOptionInput
} from "@/components/rite-options-fields";
import { SubscriptionFields } from "@/components/subscription-fields";

export function ProductSubscriptionAndRitesFields({
  defaultEndsAt,
  defaultIsSubscription,
  defaultStartsAt,
  options,
  serviceSlug
}: Readonly<{
  defaultEndsAt: string;
  defaultIsSubscription: boolean;
  defaultStartsAt: string;
  options: RiteOptionInput[];
  serviceSlug?: string;
}>) {
  const [isSubscription, setIsSubscription] = useState(defaultIsSubscription);

  return (
    <>
      <SubscriptionFields
        defaultEndsAt={defaultEndsAt}
        defaultIsSubscription={defaultIsSubscription}
        defaultStartsAt={defaultStartsAt}
        onSubscriptionChange={setIsSubscription}
      />

      {isSubscription ? (
        <p className="form-note">
          Обряды внутри раздела скрыты для абонемента. Клиент увидит карточку с
          периодом действия абонемента.
        </p>
      ) : (
        <RiteOptionsFields options={options} serviceSlug={serviceSlug} />
      )}
    </>
  );
}
