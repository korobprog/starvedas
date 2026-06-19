import { PriceUnit } from "@prisma/client";
import { z } from "zod";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry
} from "@/lib/phone-validation";
import { paymentProviderCodes } from "@/server/payment-providers";

const participantNamePattern =
  /^[\p{L}\p{M}][\p{L}\p{M}'’`.-]*(?:\s+[\p{L}\p{M}][\p{L}\p{M}'’`.-]*)+$/u;

const phoneCountrySchema = z
  .string()
  .trim()
  .optional()
  .refine((country) => !country || isPhoneCountryCode(country), {
    message: "Некорректная страна телефона"
  });

export const createOrderSchema = z
  .object({
    serviceSlug: z.string().trim().min(2).max(120),
    selectedServiceOptionIds: z
      .array(z.string().trim().min(1))
      .max(100)
      .default([]),
    participantCount: z.number().int().min(1).max(200),
    participantsText: z.string().trim().min(2).max(5000),
    customerName: z.string().trim().min(2).max(120),
    customerTelegram: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(50).optional(),
    customerPhoneCountry: phoneCountrySchema,
    customerEmail: z
      .union([z.string().trim().email(), z.literal("")])
      .optional(),
    consentPersonalData: z.literal(true),
    consentMailings: z.boolean().default(false),
    paymentProvider: z.enum(paymentProviderCodes).optional(),
    referralSlug: z.string().trim().max(120).optional()
  })
  .superRefine((data, ctx) => {
    if (
      data.customerPhone?.trim() &&
      !isValidPhoneNumberForCountry(
        data.customerPhone,
        data.customerPhoneCountry
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidPhoneMessage,
        path: ["customerPhone"]
      });
    }

    if (
      !data.customerTelegram?.trim() &&
      !data.customerPhone?.trim() &&
      !data.customerEmail?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите хотя бы один контакт",
        path: ["customerTelegram"]
      });
    }

    const participantNames = getParticipantNames(data.participantsText);

    if (participantNames.length !== data.participantCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Количество участников не совпадает со списком",
        path: ["participantsText"]
      });
    }

    if (
      participantNames.length > 200 ||
      participantNames.some((name) => !isParticipantNameValid(name))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Каждая строка участника должна содержать имя и фамилию без цифр, телефонов и лишних символов",
        path: ["participantsText"]
      });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export function getParticipantNames(participantsText: string) {
  return participantsText
    .split(/\r?\n/)
    .map((item) => normalizeParticipantName(item))
    .filter(Boolean);
}

export function normalizeParticipantName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isParticipantNameValid(value: string) {
  return value.length <= 120 && participantNamePattern.test(value);
}

export function calculateOrderAmount({
  participantCount,
  participantNames,
  priceRub,
  priceUnit
}: {
  participantCount: number;
  participantNames: string[];
  priceRub: number;
  priceUnit: PriceUnit;
}) {
  if (priceUnit === PriceUnit.PER_ORDER) {
    return priceRub;
  }

  if (priceUnit === PriceUnit.PER_NAME) {
    return priceRub * participantNames.length;
  }

  return priceRub * participantCount;
}

export function getPriceUnitQuantity({
  participantCount,
  participantNames,
  priceUnit
}: {
  participantCount: number;
  participantNames: string[];
  priceUnit: PriceUnit;
}) {
  if (priceUnit === PriceUnit.PER_ORDER) {
    return 1;
  }

  if (priceUnit === PriceUnit.PER_NAME) {
    return participantNames.length;
  }

  return participantCount;
}

export function calculateSelectedOptionsAmount({
  options,
  participantCount,
  participantNames
}: {
  options: Array<{
    priceRub: number;
    priceUnit: PriceUnit;
  }>;
  participantCount: number;
  participantNames: string[];
}) {
  return options.reduce(
    (sum, option) =>
      sum +
      option.priceRub *
        getPriceUnitQuantity({
          participantCount,
          participantNames,
          priceUnit: option.priceUnit
        }),
    0
  );
}

export function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
