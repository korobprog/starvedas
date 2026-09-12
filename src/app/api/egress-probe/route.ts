import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * ВРЕМЕННАЯ служебная ручка: проверяет, куда с прод-сервера есть исходящий
 * доступ. Нужна, чтобы выбрать площадку для релея Telegram вместо
 * приостановленного Deno Deploy. Удалить сразу после выбора площадки.
 *
 * Список адресов зашит в код специально: ручка, принимающая произвольный URL,
 * позволила бы ходить с сервера куда угодно, включая внутреннюю сеть.
 */
const probeTargets = [
  { name: "telegram-api", url: "https://api.telegram.org" },
  { name: "control-example", url: "https://example.com" },
  { name: "control-cloudflare", url: "https://www.cloudflare.com" },
  { name: "cloudflare-workers", url: "https://starvedas-probe-42.workers.dev" },
  { name: "cloudflare-pages", url: "https://starvedas-probe-42.pages.dev" },
  { name: "vercel", url: "https://starvedas-probe-42.vercel.app" },
  { name: "netlify", url: "https://starvedas-probe-42.netlify.app" },
  { name: "render", url: "https://starvedas-probe-42.onrender.com" },
  { name: "fly", url: "https://starvedas-probe-42.fly.dev" },
  { name: "railway", url: "https://starvedas-probe-42.up.railway.app" },
  { name: "deno-deploy", url: "https://starvedas-probe-42.deno.dev" },
  { name: "koyeb", url: "https://starvedas-probe-42.koyeb.app" },
  {
    name: "supabase-functions",
    url: "https://starvedas-probe-42.functions.supabase.co"
  }
];

function isAuthorized(request: NextRequest) {
  const secret = process.env.ACCOUNTING_SYNC_SECRET?.trim();

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-accounting-sync-secret");

  return Boolean(secret && (bearer === secret || headerSecret === secret));
}

async function probe(target: { name: string; url: string }) {
  const startedAt = Date.now();

  try {
    const response = await fetch(target.url, {
      cache: "no-store",
      method: "GET",
      signal: AbortSignal.timeout(8000)
    });

    return {
      name: target.name,
      url: target.url,
      reachable: true,
      status: response.status,
      ms: Date.now() - startedAt
    };
  } catch (error) {
    return {
      name: target.name,
      url: target.url,
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - startedAt
    };
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.all(probeTargets.map(probe));

  return NextResponse.json(
    {
      telegramApiBase: process.env.TELEGRAM_API_BASE ?? null,
      telegramProxyUrl: process.env.TELEGRAM_PROXY_URL ? "set" : null,
      results
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
