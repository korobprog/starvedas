import {
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
