import { normalizeLocale, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";

export const paymentProviderCodes = [
  "prodamus",
  "custom_card",
  "custom_phone"
] as const;

export const customPaymentProviderCodes = [
  "custom_card",
  "custom_phone"
] as const;

export type PaymentProviderCode = (typeof paymentProviderCodes)[number];
export type CustomPaymentProviderCode =
  (typeof customPaymentProviderCodes)[number];

export type PaymentInstructions = {
  accountNumber?: string | null;
  bankName?: string | null;
  instructions?: string | null;
  paymentComment?: string | null;
  phone?: string | null;
  recipientName?: string | null;
  verificationPeriod?: string | null;
};

export type PublicPaymentProvider = {
  active: boolean;
  code: PaymentProviderCode;
  description: string;
  instructions?: PaymentInstructions | null;
  isCustom: boolean;
  name: string;
  sortOrder: number;
  supportedLocales: Locale[];
};

export type CuratorPaymentProviderSetting = PublicPaymentProvider & {
  allowed: boolean;
  enabled: boolean;
  instructions: PaymentInstructions | null;
};

export const defaultPaymentProviders: PublicPaymentProvider[] = [
  {
    active: true,
    code: "prodamus",
    description:
      "Платежная система Prodamus с базовым адресом https://prodamus.ru.",
    isCustom: false,
    name: "Prodamus",
    sortOrder: 10,
    supportedLocales: ["ru"]
  },
  {
    active: true,
    code: "custom_card",
    description:
      "Резервная ручная оплата переводом на карту по реквизитам администратора или куратора.",
    isCustom: true,
    name: "Перевод на карту",
    sortOrder: 20,
    supportedLocales: ["ru", "en", "hi"]
  },
  {
    active: true,
    code: "custom_phone",
    description:
      "Резервная ручная оплата переводом по номеру телефона по инструкциям администратора или куратора.",
    isCustom: true,
    name: "Перевод по номеру телефона",
    sortOrder: 30,
    supportedLocales: ["ru", "en", "hi"]
  }
];

export const paymentProviderEnvNames: Record<PaymentProviderCode, string[]> = {
  prodamus: [
    "PRODAMUS_MERCHANT_ID",
    "PRODAMUS_SECRET_KEY",
    "PRODAMUS_API_URL",
    "PRODAMUS_SUCCESS_URL",
    "PRODAMUS_FAIL_URL",
    "PRODAMUS_WEBHOOK_SECRET"
  ],
  custom_card: [],
  custom_phone: []
};

export function isPaymentProviderCode(
  value: string
): value is PaymentProviderCode {
  return paymentProviderCodes.includes(value as PaymentProviderCode);
}

export function isCustomPaymentProviderCode(
  value: string
): value is CustomPaymentProviderCode {
  return customPaymentProviderCodes.includes(
    value as CustomPaymentProviderCode
  );
}

function parseSupportedLocales(value: string) {
  const locales = value
    .split(",")
    .map((item) => normalizeLocale(item.trim()))
    .filter((locale, index, list) => list.indexOf(locale) === index);

  return locales.length > 0 ? locales : (["ru"] satisfies Locale[]);
}

function serializeSupportedLocales(locales: readonly Locale[]) {
  return locales.join(",");
}

export function isPaymentProviderAvailableForLocale(
  provider: { supportedLocales: Locale[] },
  locale: string | null | undefined
) {
  return provider.supportedLocales.includes(normalizeLocale(locale));
}

export { serializeSupportedLocales };

function mergeProviderRows(
  rows: {
    active: boolean;
    code: string;
    description: string | null;
    name: string;
    sortOrder: number;
    supportedLocales: string;
  }[]
): PublicPaymentProvider[] {
  const byCode = new Map(rows.map((row) => [row.code, row]));

  return defaultPaymentProviders
    .map((fallback) => {
      const row = byCode.get(fallback.code);

      return {
        active: row?.active ?? fallback.active,
        code: fallback.code,
        description: row?.description ?? fallback.description,
        isCustom: fallback.isCustom,
        name: row?.name ?? fallback.name,
        sortOrder: row?.sortOrder ?? fallback.sortOrder,
        supportedLocales: parseSupportedLocales(
          row?.supportedLocales ?? fallback.supportedLocales.join(",")
        )
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function hasPaymentInstructions(instructions: PaymentInstructions | null) {
  if (!instructions) {
    return false;
  }

  return Object.values(instructions).some((value) => Boolean(value?.trim()));
}

function buildPaymentInstructions(
  option:
    | {
        accountNumber: string | null;
        bankName: string | null;
        instructions: string | null;
        paymentComment: string | null;
        phone: string | null;
        recipientName: string | null;
        verificationPeriod: string | null;
      }
    | null
    | undefined
): PaymentInstructions | null {
  if (!option) {
    return null;
  }

  const instructions = {
    accountNumber: option.accountNumber,
    bankName: option.bankName,
    instructions: option.instructions,
    paymentComment: option.paymentComment,
    phone: option.phone,
    recipientName: option.recipientName,
    verificationPeriod: option.verificationPeriod
  };

  return hasPaymentInstructions(instructions) ? instructions : null;
}

export function getDefaultCuratorPaymentProviderState({
  isSystem,
  providerCode
}: {
  isSystem: boolean;
  providerCode: PaymentProviderCode;
}) {
  if (isCustomPaymentProviderCode(providerCode)) {
    return {
      allowed: isSystem,
      enabled: isSystem
    };
  }

  return {
    allowed: true,
    enabled: true
  };
}

export async function getPaymentProviders(): Promise<PublicPaymentProvider[]> {
  try {
    const rows = await prisma.paymentProvider.findMany({
      orderBy: {
        sortOrder: "asc"
      },
      select: {
        active: true,
        code: true,
        description: true,
        name: true,
        sortOrder: true,
        supportedLocales: true
      }
    });

    return mergeProviderRows(rows);
  } catch {
    return defaultPaymentProviders;
  }
}

export async function getActivePaymentProviders(): Promise<
  PublicPaymentProvider[]
> {
  const providers = await getPaymentProviders();

  return providers.filter((provider) => provider.active);
}

export async function getCuratorPaymentProviderSettings(
  curatorId: string
): Promise<CuratorPaymentProviderSetting[]> {
  const [providers, curator] = await Promise.all([
    getPaymentProviders(),
    prisma.curator.findUnique({
      where: {
        id: curatorId
      },
      select: {
        isSystem: true,
        paymentOptions: {
          select: {
            accountNumber: true,
            allowed: true,
            bankName: true,
            enabled: true,
            instructions: true,
            paymentComment: true,
            phone: true,
            providerCode: true,
            recipientName: true,
            verificationPeriod: true
          }
        }
      }
    })
  ]);
  const paymentOptionsByCode = new Map(
    curator?.paymentOptions.map((option) => [option.providerCode, option]) ?? []
  );

  return providers.map((provider): CuratorPaymentProviderSetting => {
    const option = paymentOptionsByCode.get(provider.code);
    const defaultState = getDefaultCuratorPaymentProviderState({
      isSystem: curator?.isSystem ?? false,
      providerCode: provider.code
    });
    const allowed = option?.allowed ?? defaultState.allowed;

    return {
      ...provider,
      allowed,
      enabled: allowed && (option?.enabled ?? defaultState.enabled),
      instructions: buildPaymentInstructions(option)
    };
  });
}

export async function getCheckoutPaymentProvidersForCurator(
  curatorId: string,
  locale?: string | null
): Promise<CuratorPaymentProviderSetting[]> {
  const providers = await getCuratorPaymentProviderSettings(curatorId);

  return providers.filter(
    (provider) =>
      provider.active &&
      provider.allowed &&
      provider.enabled &&
      isPaymentProviderAvailableForLocale(provider, locale)
  );
}

export async function getPaymentProviderForCheckout(
  code?: string,
  curatorId?: string,
  locale?: string | null
): Promise<PublicPaymentProvider | CuratorPaymentProviderSetting | null> {
  const allProviders = curatorId
    ? await getCheckoutPaymentProvidersForCurator(curatorId, locale)
    : await getActivePaymentProviders();
  const providers = allProviders.filter((provider) =>
    isPaymentProviderAvailableForLocale(provider, locale)
  );

  if (code && isPaymentProviderCode(code)) {
    return providers.find((provider) => provider.code === code) ?? null;
  }

  return providers[0] ?? null;
}
