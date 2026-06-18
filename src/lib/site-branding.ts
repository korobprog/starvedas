export const defaultSiteBrandName = "StarVedas";
export const chintamaniSiteBrandName = "chintamanidhama";

export function applySiteBrandToText(
  text: string,
  brandName = defaultSiteBrandName
) {
  if (brandName === defaultSiteBrandName) {
    return text;
  }

  return text
    .replaceAll(defaultSiteBrandName, brandName)
    .replaceAll("Star Vedas", brandName)
    .replaceAll("STARVEDAS", brandName.toUpperCase())
    .replaceAll("starvedas", brandName);
}

export function applySiteBrandToCopy<T>(
  value: T,
  brandName = defaultSiteBrandName
): T {
  if (brandName === defaultSiteBrandName) {
    return value;
  }

  if (typeof value === "string") {
    return applySiteBrandToText(value, brandName) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => applySiteBrandToCopy(item, brandName)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        applySiteBrandToCopy(entry, brandName)
      ])
    ) as T;
  }

  return value;
}
