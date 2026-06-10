const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const telegramHandlePattern = /^@[a-zA-Z0-9_]{5,32}$/;
const phonePattern = /^\+?[0-9][0-9\s().-]{5,}$/;
const allowedProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

export const defaultSupportButtonLabel = "Написать вопрос куратору";

export function normalizeSupportUrlInput(value: string | null | undefined) {
  const text = value?.trim() ?? "";

  if (!text) {
    return null;
  }

  if (telegramHandlePattern.test(text)) {
    return `https://t.me/${text.slice(1)}`;
  }

  if (emailPattern.test(text)) {
    return `mailto:${text}`;
  }

  if (phonePattern.test(text)) {
    return `tel:${text.replace(/[^\d+]/g, "")}`;
  }

  return text;
}

export function isSafeSupportUrl(value: string | null) {
  if (!value) {
    return true;
  }

  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);

    return allowedProtocols.has(url.protocol);
  } catch {
    return false;
  }
}
