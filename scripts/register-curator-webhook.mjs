import http from "node:http";
import https from "node:https";
import tls from "node:tls";

const telegramRequestTimeoutMs = 15000;
const defaultTelegramApiIps = ["149.154.167.220"];

function trimEnv(name) {
  return process.env[name]?.trim() || "";
}

function getTelegramProxyUrl() {
  return (
    trimEnv("CURATOR_TELEGRAM_PROXY_URL") ||
    trimEnv("TELEGRAM_PROXY_URL") ||
    trimEnv("HTTPS_PROXY") ||
    trimEnv("HTTP_PROXY") ||
    null
  );
}

function getTelegramApiIps() {
  const raw = trimEnv("TELEGRAM_API_IPS");

  return raw
    ? raw
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean)
    : defaultTelegramApiIps;
}

function getWebhookUrl() {
  const explicitUrl = trimEnv("CURATOR_TELEGRAM_WEBHOOK_URL");

  if (explicitUrl) {
    return explicitUrl;
  }

  const origin =
    trimEnv("CURATOR_MINI_APP_SITE_URL") || trimEnv("NEXT_PUBLIC_SITE_URL");

  if (!origin) {
    return "";
  }

  return `${origin.replace(/\/$/, "")}/api/telegram/curator/webhook`;
}

function parseHttpStatus(rawResponse) {
  const [rawHeaders, body = ""] = rawResponse.split("\r\n\r\n");
  const statusLine = rawHeaders?.split("\r\n", 1)[0] ?? "";
  const match = statusLine.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})\s*(.*)$/);

  if (!match) {
    throw new Error("Telegram proxy returned an invalid HTTP response");
  }

  const status = Number(match[1]);

  return {
    body: body.slice(0, 500),
    ok: status >= 200 && status < 300,
    status,
    statusText: match[2] || ""
  };
}

async function postJsonViaHttpProxy(targetUrl, payload, proxyUrl) {
  const target = new URL(targetUrl);
  const proxy = new URL(proxyUrl);

  if (proxy.protocol !== "http:") {
    throw new Error("Only http:// Telegram proxy URLs are supported");
  }

  const body = JSON.stringify(payload);
  const proxyPort = Number(proxy.port || 80);
  const targetPort = Number(target.port || 443);

  return new Promise((resolve, reject) => {
    const request = http.request({
      host: proxy.hostname,
      method: "CONNECT",
      path: `${target.hostname}:${targetPort}`,
      port: proxyPort,
      timeout: telegramRequestTimeoutMs
    });

    request.once("connect", (response, socket, head) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(
          new Error(
            `Telegram proxy CONNECT failed: ${response.statusCode ?? "unknown"}`
          )
        );
        return;
      }

      if (head.length > 0) {
        socket.unshift(head);
      }

      const secureSocket = tls.connect({
        servername: target.hostname,
        socket
      });
      const chunks = [];

      secureSocket.setTimeout(telegramRequestTimeoutMs);
      secureSocket.once("secureConnect", () => {
        secureSocket.write(
          [
            `POST ${target.pathname}${target.search} HTTP/1.1`,
            `Host: ${target.hostname}`,
            "Content-Type: application/json",
            `Content-Length: ${Buffer.byteLength(body)}`,
            "Connection: close",
            "",
            body
          ].join("\r\n")
        );
      });
      secureSocket.on("data", (chunk) => chunks.push(chunk));
      secureSocket.once("end", () => {
        try {
          resolve(parseHttpStatus(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(error);
        }
      });
      secureSocket.once("timeout", () => {
        secureSocket.destroy(new Error("Telegram proxy request timed out"));
      });
      secureSocket.once("error", reject);
    });
    request.once("timeout", () => {
      request.destroy(new Error("Telegram proxy CONNECT timed out"));
    });
    request.once("error", reject);
    request.end();
  });
}

async function postJsonViaTelegramIp(targetUrl, payload, ipAddress) {
  const target = new URL(targetUrl);
  const body = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        headers: {
          "Content-Type": "application/json",
          Host: target.hostname
        },
        hostname: ipAddress,
        method: "POST",
        path: `${target.pathname}${target.search}`,
        port: 443,
        servername: target.hostname,
        timeout: telegramRequestTimeoutMs
      },
      (response) => {
        const chunks = [];

        response.on("data", (chunk) => chunks.push(chunk));
        response.once("end", () => {
          const status = response.statusCode ?? 0;

          resolve({
            body: Buffer.concat(chunks).toString("utf8").slice(0, 500),
            ok: status >= 200 && status < 300,
            status,
            statusText: response.statusMessage ?? ""
          });
        });
      }
    );

    request.once("timeout", () => {
      request.destroy(new Error("Telegram pinned-IP request timed out"));
    });
    request.once("error", reject);
    request.write(body);
    request.end();
  });
}

async function postTelegramJson(url, payload) {
  const proxyUrl = getTelegramProxyUrl();

  if (proxyUrl) {
    return postJsonViaHttpProxy(url, payload, proxyUrl);
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    telegramRequestTimeoutMs
  );

  try {
    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal
    });
    const body = await response.text().catch(() => "");

    return {
      body: body.slice(0, 500),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    let lastError = error;

    for (const ipAddress of getTelegramApiIps()) {
      try {
        return await postJsonViaTelegramIp(url, payload, ipAddress);
      } catch (pinnedIpError) {
        lastError = pinnedIpError;
      }
    }

    throw lastError;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const botToken = trimEnv("CURATOR_TELEGRAM_BOT_TOKEN");
  const webhookUrl = getWebhookUrl();

  if (!botToken) {
    console.log(
      "Curator Telegram webhook registration skipped: token is not configured"
    );
    return;
  }

  if (!webhookUrl) {
    console.log(
      "Curator Telegram webhook registration skipped: public URL is not configured"
    );
    return;
  }

  const payload = {
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
    url: webhookUrl
  };
  const secretToken = trimEnv("CURATOR_TELEGRAM_WEBHOOK_SECRET");

  if (secretToken) {
    payload.secret_token = secretToken;
  }

  try {
    const response = await postTelegramJson(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      payload
    );

    if (!response.ok) {
      console.error(
        `Curator Telegram setWebhook failed: ${response.status} ${response.statusText} ${response.body ?? ""}`.trim()
      );
      return;
    }

    console.log(`Curator Telegram webhook registered: ${webhookUrl}`);
  } catch (error) {
    console.error("Curator Telegram webhook registration failed", error);
  }
}

await main();
