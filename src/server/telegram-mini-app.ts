import crypto from "node:crypto";

export type TelegramMiniAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
};

export type ValidatedTelegramMiniAppData = {
  authDate: Date;
  queryId?: string;
  startParam?: string;
  user: TelegramMiniAppUser;
};

const maxAuthAgeSeconds = 60 * 60 * 24;

function timingSafeEqualHex(a: string, b: string) {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  return (
    aBuffer.length === bBuffer.length &&
    crypto.timingSafeEqual(aBuffer, bBuffer)
  );
}

export function getTelegramBotToken() {
  return process.env.CURATOR_TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function getCuratorTelegramBotUsername() {
  return (
    process.env.NEXT_PUBLIC_CURATOR_TELEGRAM_BOT_USERNAME ??
    process.env.CURATOR_TELEGRAM_BOT_USERNAME ??
    ""
  )
    .trim()
    .replace(/^@/, "");
}

export function validateTelegramMiniAppInitData(
  initData: string,
  botToken: string
): ValidatedTelegramMiniAppData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram initData hash is missing");
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!timingSafeEqualHex(calculatedHash, hash)) {
    throw new Error("Telegram initData signature is invalid");
  }

  const authDateValue = params.get("auth_date");
  const authDateUnix = authDateValue ? Number(authDateValue) : NaN;

  if (!Number.isFinite(authDateUnix)) {
    throw new Error("Telegram initData auth_date is missing");
  }

  const authDate = new Date(authDateUnix * 1000);

  if (Date.now() - authDate.getTime() > maxAuthAgeSeconds * 1000) {
    throw new Error("Telegram initData is expired");
  }

  const rawUser = params.get("user");

  if (!rawUser) {
    throw new Error("Telegram initData user is missing");
  }

  const user = JSON.parse(rawUser) as TelegramMiniAppUser;

  if (!user.id) {
    throw new Error("Telegram initData user id is missing");
  }

  return {
    authDate,
    queryId: params.get("query_id") ?? undefined,
    startParam: params.get("start_param") ?? undefined,
    user
  };
}

export function getTelegramDisplayName(user: TelegramMiniAppUser) {
  return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
}

export function getTelegramUsername(user: TelegramMiniAppUser) {
  return user.username ? `@${user.username}` : null;
}

export function encodeTelegramProfileCookieValue(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function tryDecodeUriComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function tryRepairLatin1Mojibake(value: string) {
  if (!/[ÃÂÐÑ]/.test(value)) {
    return value;
  }

  const repaired = Buffer.from(value, "latin1").toString("utf8");

  return repaired.includes("�") ? value : repaired;
}

export function decodeTelegramProfileCookieValue(value: string | undefined) {
  const normalized = tryDecodeUriComponent((value ?? "").trim());

  if (!normalized) {
    return "";
  }

  if (/^[A-Za-z0-9_-]+={0,2}$/.test(normalized)) {
    try {
      const decoded = Buffer.from(normalized, "base64url").toString("utf8");

      if (decoded && !decoded.includes("�")) {
        return decoded;
      }
    } catch {
      // Fall back to the raw cookie value below.
    }
  }

  return tryRepairLatin1Mojibake(normalized);
}
