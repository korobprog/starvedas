// Релей к Telegram Bot API для Deno Deploy.
//
// Зачем: с прод-сервера (178.209.127.139) api.telegram.org недоступен —
// и DNS-адреса, и IPv6 уходят в таймаут. Транспортный прокси на sing-box
// эту роль выполнял, но его VLESS-узлы регулярно умирают. Релей от узлов
// не зависит вообще: deno.dev с сервера открыт, а до Telegram Deno Deploy
// дотягивается сам.
//
// Разворачивается прямо из GitHub-репозитория: Deno Deploy → New App →
// Deploy from GitHub → ветка + `relay/telegram-relay.ts` как entrypoint.
// Ни CLI, ни передачи токенов не требуется.
//
// Клиент вместо https://api.telegram.org/<путь> зовёт
// https://<приложение>.deno.dev/<путь> — см. TELEGRAM_API_BASE в приложении.

const UPSTREAM = "https://api.telegram.org";

// Пропускаем только то, что похоже на вызов Bot API. Всё прочее — 404,
// чтобы релей не превратился в универсальный открытый прокси.
// Покрывает /bot<token>/<метод> и /file/bot<token>/<путь>.
const ALLOWED = /^\/(file\/)?bot\d+:[A-Za-z0-9_-]+\/.+/;

// Если задан, релей закрыт: без совпадающего заголовка им не воспользоваться,
// даже зная адрес. Задаётся в Settings → Environment Variables (production).
const RELAY_TOKEN = Deno.env.get("RELAY_TOKEN") ?? "";

// Второй рубеж, не требующий общего секрета: список адресов, с которых можно
// ходить. Нужен, когда релей живёт на своём сервере за Traefik, а значение
// общего секрета недоступно тому, кто настраивает релей.
const ALLOWED_IPS = (Deno.env.get("ALLOWED_IPS") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function getClientIp(request: Request) {
  // Traefik кладёт исходный адрес первым в цепочке.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";

  return forwarded.split(",")[0]?.trim() ?? "";
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);

  // Намеренно до проверки секрета: иначе нечем диагностировать доступность.
  if (url.pathname === "/health") {
    return Response.json({
      allowedIps: ALLOWED_IPS.length,
      ok: true,
      protected: RELAY_TOKEN !== "" || ALLOWED_IPS.length > 0,
      upstream: UPSTREAM
    });
  }

  if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(getClientIp(request))) {
    return Response.json(
      { error: "ip not allowed", ok: false },
      { status: 403 }
    );
  }

  // Тело ответа отличается от чужого 401 — по статусу их не различить,
  // а различать нужно, чтобы понять, включилась ли защита.
  if (RELAY_TOKEN && request.headers.get("x-relay-token") !== RELAY_TOKEN) {
    return Response.json({ error: "unauthorized", ok: false }, { status: 401 });
  }

  if (!ALLOWED.test(url.pathname)) {
    return Response.json(
      { error: "path not allowed", ok: false },
      { status: 404 }
    );
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("x-relay-token");

  const upstream = await fetch(UPSTREAM + url.pathname + url.search, {
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
    headers,
    method: request.method,
    redirect: "follow"
  });

  // Тело здесь уже распаковано, а content-encoding/content-length остались от
  // сжатого оригинала. Прокинуть их — значит заставить клиента распаковывать
  // распакованное: статус придёт верный, а тело окажется нечитаемым.
  const out = new Headers(upstream.headers);
  out.delete("content-encoding");
  out.delete("content-length");
  out.delete("transfer-encoding");

  return new Response(upstream.body, { headers: out, status: upstream.status });
});
