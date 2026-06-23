import { normalizeSourceDomain } from "@/server/source-domain";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function clean(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed ? trimTrailingSlash(trimmed) : undefined;
}

export function getSiteUrlForSourceDomain(sourceDomain?: string | null) {
  const normalizedDomain = normalizeSourceDomain(sourceDomain);

  if (normalizedDomain === "chintamanidhama.ru") {
    return (
      clean(process.env.NEXT_PUBLIC_REFERRAL_SITE_URL) ??
      clean(process.env.CURATOR_MINI_APP_SITE_URL) ??
      "https://chintamanidhama.ru"
    );
  }

  return clean(process.env.NEXT_PUBLIC_SITE_URL) ?? "https://starvedas.ru";
}
