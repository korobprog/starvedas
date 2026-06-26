export const allowedSourceDomains = [
  "starvedas.ru",
  "chintamanidhama.ru"
] as const;

export type SourceDomain = (typeof allowedSourceDomains)[number];

const defaultSourceDomain: SourceDomain = "starvedas.ru";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export function normalizeSourceDomain(value?: string | null): SourceDomain {
  const host = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
    .replace(/^www\./, "");

  return (
    allowedSourceDomains.find((domain) => domain === host) ??
    defaultSourceDomain
  );
}

export function getSourceDomainFromHeaders(
  headers: Pick<Headers, "get">
): SourceDomain {
  return normalizeSourceDomain(
    firstHeaderValue(headers.get("x-forwarded-host")) ||
      firstHeaderValue(headers.get("host"))
  );
}

export function getSourceDomainLabel(sourceDomain?: string | null) {
  return normalizeSourceDomain(sourceDomain);
}
