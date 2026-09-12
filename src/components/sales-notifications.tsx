"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

const pollIntervalMs = 60_000;

type SalesContextValue = {
  count: number;
  refresh: () => Promise<void>;
};

const SalesContext = createContext<SalesContextValue>({
  count: 0,
  refresh: async () => undefined
});

export function useUnseenSalesCount() {
  return useContext(SalesContext).count;
}

type AppBadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/**
 * Счётчик новых продаж: цифра в меню, в заголовке вкладки и на иконке
 * установленного приложения. Обновляется опросом раз в минуту и сразу после
 * возврата на вкладку.
 */
export function SalesNotificationsProvider({
  children,
  initialCount
}: {
  children: ReactNode;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/sales/unseen", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { count?: number };

      if (typeof data.count === "number") {
        setCount(data.count);
      }
    } catch {
      // Сеть могла моргнуть — оставляем прежнюю цифру до следующего опроса.
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(refresh, pollIntervalMs);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  // Заголовок вкладки: «(3) Админка StarVedas». Next выставляет заголовок
  // после перехода, поэтому следим за изменениями и возвращаем цифру.
  useEffect(() => {
    function applyPrefix() {
      const clean = document.title.replace(/^\(\d+\)\s*/, "");

      // Пока Next не выставил заголовок страницы, трогать его нечего.
      if (!clean) {
        return;
      }

      const next = count > 0 ? `(${count}) ${clean}` : clean;

      if (document.title !== next) {
        document.title = next;
      }
    }

    applyPrefix();

    // Next подменяет сам элемент <title>, поэтому следим за всей <head>.
    const observer = new MutationObserver(applyPrefix);

    observer.observe(document.head, {
      characterData: true,
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, [count]);

  // Иконка установленного приложения — как непрочитанные в Telegram.
  useEffect(() => {
    const appNavigator = navigator as AppBadgeNavigator;

    if (typeof appNavigator.setAppBadge !== "function") {
      return;
    }

    if (count > 0) {
      void appNavigator.setAppBadge(count).catch(() => undefined);
    } else {
      void appNavigator.clearAppBadge?.().catch(() => undefined);
    }
  }, [count]);

  return (
    <SalesContext.Provider value={{ count, refresh }}>
      {children}
    </SalesContext.Provider>
  );
}

/** Кружок с числом. Пустой счётчик ничего не рисует. */
export function SalesBadge({ count }: { count: number }) {
  if (count < 1) {
    return null;
  }

  return (
    <span aria-hidden="true" className="notification-badge">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Кружок, который сам берёт число из контекста — для серверных страниц. */
export function SalesCountBadge() {
  return <SalesBadge count={useUnseenSalesCount()} />;
}

/** Помечает продажи просмотренными при открытии раздела. */
export function MarkSalesSeen() {
  const { refresh } = useContext(SalesContext);

  useEffect(() => {
    let cancelled = false;

    async function markSeen() {
      try {
        await fetch("/api/sales/unseen", { method: "POST" });

        if (!cancelled) {
          await refresh();
        }
      } catch {
        // Не смогли отметить — цифра просто останется до следующего захода.
      }
    }

    void markSeen();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return null;
}
