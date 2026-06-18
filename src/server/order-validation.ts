import { PriceUnit } from "@prisma/client";
import { z } from "zod";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry
} from "@/lib/phone-validation";
import { paymentProviderCodes } from "@/server/payment-providers";

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
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export function getParticipantNames(participantsText: string) {
  return participantsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
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

export function calculateSelectedOptionsAmount({
  participantCount,
  priceRubSum
}: {
  participantCount: number;
  priceRubSum: number;
}) {
  return priceRubSum * participantCount;
}

export function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
