import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode
} from "libphonenumber-js";

export type PhoneCountryCode = CountryCode;

export const defaultPhoneCountry: PhoneCountryCode = "RU";
export const invalidPhoneMessage =
  "Введите корректный телефон для выбранной страны";

const phoneInputPattern = /^[+\d\s().-]+$/;
const phoneDigitPattern = /\d/;
const phoneCountries = getCountries();
const countriesWithBracketedAreaCode = new Set<PhoneCountryCode>([
  "KZ" as PhoneCountryCode,
  "RU" as PhoneCountryCode
]);

function getSafeCountry(country?: string | null): PhoneCountryCode {
  return isPhoneCountryCode(country) ? country : defaultPhoneCountry;
}

function createRegionNames(locale?: string | null) {
  if (!("DisplayNames" in Intl)) {
    return null;
  }

  try {
    return new Intl.DisplayNames([locale || "ru"], { type: "region" });
  } catch {
    return new Intl.DisplayNames(["ru"], { type: "region" });
  }
}

export function isPhoneCountryCode(
  country?: string | null
): country is PhoneCountryCode {
  return Boolean(country && phoneCountries.includes(country as CountryCode));
}

export function getDefaultPhoneCountry(locale?: string | null) {
  return locale?.toLowerCase().startsWith("hi")
    ? ("IN" as PhoneCountryCode)
    : defaultPhoneCountry;
}

export function getPhoneCountryCallingCode(country: PhoneCountryCode) {
  return getCountryCallingCode(country);
}

export function getPhoneCountryOptions(locale?: string | null) {
  const regionNames = createRegionNames(locale);

  return phoneCountries
    .map((country) => {
      const countryName = regionNames?.of(country) ?? country;

      return {
        code: country,
        label: `${countryName} +${getCountryCallingCode(country)}`
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function formatPhoneNumberInput(value: string, country?: string | null) {
  const safeCountry = getSafeCountry(country);

  if (countriesWithBracketedAreaCode.has(safeCountry)) {
    return formatBracketedAreaCodePhone(value, safeCountry);
  }

  const cleaned = value.replace(/[^\d+]/g, "");

  return cleaned ? new AsYouType(safeCountry).input(cleaned) : "";
}

function formatBracketedAreaCodePhone(
  value: string,
  country: PhoneCountryCode
) {
  const hasInternationalPrefix = value.trimStart().startsWith("+");
  let digits = value.replace(/\D/g, "");
  const callingCode = getCountryCallingCode(country);

  if (hasInternationalPrefix && digits.startsWith(callingCode)) {
    digits = digits.slice(callingCode.length);
  } else if (digits.length === 11 && /^[78]/.test(digits)) {
    digits = digits.slice(1);
  }

  if (!digits) {
    return "";
  }

  const areaCode = digits.slice(0, 3);
  const firstPart = digits.slice(3, 6);
  const secondPart = digits.slice(6, 8);
  const thirdPart = digits.slice(8, 10);
  let formatted = areaCode;

  if (firstPart) {
    formatted += ` ${firstPart}`;
  }

  if (secondPart) {
    formatted += `-${secondPart}`;
  }

  if (thirdPart) {
    formatted += `-${thirdPart}`;
  }

  return formatted;
}

export function isValidPhoneNumberForCountry(
  value?: string | null,
  country?: string | null
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return true;
  }

  if (!phoneInputPattern.test(trimmed) || !phoneDigitPattern.test(trimmed)) {
    return false;
  }

  const phoneNumber = parsePhoneNumberFromString(
    trimmed,
    getSafeCountry(country)
  );

  return phoneNumber?.isValid() ?? false;
}

export function normalizePhoneNumber(
  value?: string | null,
  country?: string | null
) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const phoneNumber = parsePhoneNumberFromString(
    trimmed,
    getSafeCountry(country)
  );

  return phoneNumber?.isValid() ? phoneNumber.number : trimmed;
}
