import { PriceUnit } from "@prisma/client";
import { z } from "zod";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry
} from "@/lib/phone-validation";
import {
  CHILD_RECORD_MAX_COUNT,
  CHILD_RECORD_MIN_COUNT,
  CHILD_RECORDS_MAX_ROWS
} from "@/lib/shraddha";
import { paymentProviderCodes } from "@/server/payment-providers";

const participantNamePattern =
  /^[\p{L}\p{M}][\p{L}\p{M}'’`.-]*\s+[\p{L}\p{M}][\p{L}\p{M}'’`.-]*$/u;

export const childRecordSchema = z.object({
  type: z.enum(["UNBORN", "DECEASED"]),
  parentName: z
    .string()
    .trim()
    .max(120)
    .refine((value) => isParticipantNameValid(value), {
      message:
        "ФИО родителя должно содержать имя и фамилию, без цифр и лишних символов"
    }),
  childCount: z
    .number()
    .int()
    .min(CHILD_RECORD_MIN_COUNT)
    .max(CHILD_RECORD_MAX_COUNT)
});

const childRecordsSchema = z
  .array(childRecordSchema)
  .max(CHILD_RECORDS_MAX_ROWS)
  .default([]);

const phoneCountrySchema = z
  .string()
  .trim()
  .optional()
  .refine((country) => !country || isPhoneCountryCode(country), {
    message: "Некорректная страна телефона"
  });

const participantNamesMessage =
  "Каждая строка участника должна содержать ровно два слова: имя и фамилию, без цифр, телефонов и лишних символов";

export const orderItemSchema = z.object({
  serviceSlug: z.string().trim().min(2).max(120),
  selectedServiceOptionIds: z
    .array(z.string().trim().min(1))
    .max(100)
    .default([]),
  participantCount: z.number().int().min(0).max(200),
  participantsText: z.string().trim().max(5000).default(""),
  childRecords: childRecordsSchema
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type ChildRecordInputParsed = z.infer<typeof childRecordSchema>;

export const createOrderSchema = z
  .object({
    serviceSlug: z.string().trim().min(2).max(120).optional(),
    selectedServiceOptionIds: z
      .array(z.string().trim().min(1))
      .max(100)
      .default([]),
    participantCount: z.number().int().min(0).max(200).optional(),
    participantsText: z.string().trim().max(5000).optional(),
    childRecords: childRecordsSchema,
    items: z.array(orderItemSchema).min(1).max(50).optional(),
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

    const isMulti = Boolean(data.items && data.items.length > 0);

    if (isMulti) {
      let totalNames = 0;

      data.items!.forEach((item, index) => {
        const names = getParticipantNames(item.participantsText);

        totalNames += names.length;

        if (names.length !== item.participantCount) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Количество участников не совпадает со списком",
            path: ["items", index, "participantsText"]
          });
        }

        if (names.some((name) => !isParticipantNameValid(name))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: participantNamesMessage,
            path: ["items", index, "participantsText"]
          });
        }
      });

      if (totalNames > 200) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Слишком много участников в заказе",
          path: ["items"]
        });
      }

      return;
    }

    if (!data.serviceSlug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите услугу",
        path: ["serviceSlug"]
      });
      return;
    }

    const participantNames = getParticipantNames(data.participantsText ?? "");
    const childRecordsCount = data.childRecords.length;
    const participantCount = data.participantCount ?? 0;

    if (participantNames.length === 0 && childRecordsCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Добавьте список участников",
        path: ["participantsText"]
      });
      return;
    }

    if (participantNames.length !== participantCount) {
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
        message: participantNamesMessage,
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
  childUnits = 0,
  participantCount,
  participantNames,
  priceRub,
  priceUnit
}: {
  childUnits?: number;
  participantCount: number;
  participantNames: string[];
  priceRub: number;
  priceUnit: PriceUnit;
}) {
  return (
    priceRub *
    getPriceUnitQuantity({
      childUnits,
      participantCount,
      participantNames,
      priceUnit
    })
  );
}

export function getPriceUnitQuantity({
  childUnits = 0,
  participantCount,
  participantNames,
  priceUnit
}: {
  childUnits?: number;
  participantCount: number;
  participantNames: string[];
  priceUnit: PriceUnit;
}) {
  if (priceUnit === PriceUnit.PER_ORDER) {
    return 1;
  }

  // Дети — дополнительные оплачиваемые единицы наравне с участниками.
  if (priceUnit === PriceUnit.PER_NAME) {
    return participantNames.length + childUnits;
  }

  return participantCount + childUnits;
}

export function calculateSelectedOptionsAmount({
  childUnits = 0,
  options,
  participantCount,
  participantNames
}: {
  childUnits?: number;
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
          childUnits,
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
