"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PaymentStatusResponse = {
  clientOrderPath?: string;
  confirmed?: boolean;
  failed?: boolean;
};

type PaymentProcessingStatusProps = {
  orderToken: string;
};

export function PaymentProcessingStatus({
  orderToken
}: PaymentProcessingStatusProps) {
  const router = useRouter();
  const [isLongWait, setIsLongWait] = useState(false);
  const [statusText, setStatusText] = useState("Ждём подтверждение оплаты…");

  const clientOrderPath = useMemo(
    () => `/client/orders/${encodeURIComponent(orderToken)}`,
    [orderToken]
  );

  useEffect(() => {
    let isMounted = true;
    let isDone = false;
    let attempts = 0;

    const pollPaymentStatus = async () => {
      if (isDone) {
        return;
      }

      attempts += 1;

      try {
        const response = await fetch(
          `/api/orders/payment-status?order=${encodeURIComponent(orderToken)}`,
          {
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error("Payment status request failed");
        }

        const data = (await response.json()) as PaymentStatusResponse;

        if (!isMounted) {
          return;
        }

        if (data.confirmed) {
          isDone = true;
          setStatusText("Оплата подтверждена. Показываем данные заказа…");
          window.setTimeout(() => {
            router.refresh();
          }, 700);
          return;
        }

        if (data.failed) {
          isDone = true;
          setStatusText("Оплата не подтвердилась. Открываем страницу заказа…");
          window.setTimeout(() => {
            router.replace(data.clientOrderPath ?? clientOrderPath);
          }, 900);
          return;
        }

        if (attempts >= 10) {
          setIsLongWait(true);
          setStatusText("Подтверждение занимает чуть больше времени.");
        }
      } catch {
        if (isMounted && attempts >= 3) {
          setIsLongWait(true);
          setStatusText("Статус обновится автоматически или в заказе.");
        }
      }
    };

    void pollPaymentStatus();
    const intervalId = window.setInterval(() => {
      void pollPaymentStatus();
    }, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [clientOrderPath, orderToken, router]);

  return (
    <div aria-live="polite" className="payment-processing">
      <div aria-hidden="true" className="payment-processing__spinner" />
      <div className="payment-processing__content">
        <strong>{statusText}</strong>
        <p>
          {isLongWait
            ? "Иногда банк подтверждает платёж дольше обычного. Можете открыть заказ — как только подтверждение придёт, статус обновится."
            : "Обычно это занимает несколько секунд. Пожалуйста, не закрывайте страницу."}
        </p>
        <a className="button" href={clientOrderPath}>
          Открыть заказ
        </a>
      </div>
    </div>
  );
}
