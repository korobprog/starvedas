"use server";

import { ClientFunnelStatus, UserRole, type Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry,
  normalizePhoneNumber
} from "@/lib/phone-validation";
import { setAuthSession } from "@/server/auth";
import { setClientSession } from "@/server/client-auth";
import { recordClientFunnelEvent } from "@/server/client-profiles";
import { hashPassword } from "@/server/password";
import { getCuratorForReferral, referralCookieName } from "@/server/referrals";
import { getSourceDomainFromHeaders } from "@/server/source-domain";

export type ClientRegistrationActionState = {
  error?: string;
};

const clientRegistrationSchema = z
  .object({
    consentMailings: z.boolean().default(false),
    consentPersonalData: z.literal(true, {
      message: "Нужно согласие на обработку персональных данных"
    }),
    email: z.string().trim().email("Введите корректный email"),
    name: z.string().trim().min(2, "Введите имя").max(120),
    password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
    passwordConfirm: z.string().min(1, "Повторите пароль"),
    phone: z.string().trim().max(50).optional(),
    phoneCountry: z
      .string()
      .trim()
      .optional()
      .refine((country) => !country || isPhoneCountryCode(country), {
        message: "Некорректная страна телефона"
      }),
    referralSlug: z.string().trim().max(120).optional(),
    telegram: z.string().trim().max(120).optional()
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.passwordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Пароли не совпадают",
        path: ["passwordConfirm"]
      });
    }

    if (
      data.phone?.trim() &&
      !isValidPhoneNumberForCountry(data.phone, data.phoneCountry)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: invalidPhoneMessage,
        path: ["phone"]
      });
    }
  });

function getBooleanFormValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();

  return trimmed || null;
}

function buildClientIdentityWhere({
  email,
  phone,
  sourceDomain,
  telegram
}: {
  email: string;
  phone: string | null;
  sourceDomain: string;
  telegram: string | null;
}) {
  const identityWhere: Prisma.ClientProfileWhereInput[] = [
    { email, sourceDomain }
  ];

  if (phone) {
    identityWhere.push({ phone, sourceDomain });
  }

  if (telegram) {
    identityWhere.push({ telegram, sourceDomain });
  }

  return identityWhere;
}

export async function registerClientAction(
  _state: ClientRegistrationActionState,
  formData: FormData
): Promise<ClientRegistrationActionState> {
  const parsed = clientRegistrationSchema.safeParse({
    consentMailings: getBooleanFormValue(formData.get("consentMailings")),
    consentPersonalData: getBooleanFormValue(
      formData.get("consentPersonalData")
    ),
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    phone: formData.get("phone") || undefined,
    phoneCountry: formData.get("phoneCountry") || undefined,
    referralSlug: formData.get("referralSlug") || undefined,
    telegram: formData.get("telegram") || undefined
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Проверьте данные регистрации"
    };
  }

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const sourceDomain = getSourceDomainFromHeaders(requestHeaders);
  const requestedReferralSlug =
    normalizeOptional(parsed.data.referralSlug) ||
    normalizeOptional(cookieStore.get(referralCookieName)?.value);
  const curator = await getCuratorForReferral(requestedReferralSlug);
  const email = parsed.data.email.toLocaleLowerCase("ru");
  const phone = normalizePhoneNumber(
    parsed.data.phone,
    parsed.data.phoneCountry
  );
  const telegram = normalizeOptional(parsed.data.telegram);
  const passwordHash = await hashPassword(parsed.data.password);
  const consentMailings = curator.showMailingConsentCheckbox
    ? parsed.data.consentMailings
    : false;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    return {
      error:
        "Пользователь с таким email уже зарегистрирован. Войдите в кабинет."
    };
  }

  try {
    const { clientId, userId } = await prisma.$transaction(async (tx) => {
      const existingClient = await tx.clientProfile.findFirst({
        orderBy: { updatedAt: "desc" },
        select: {
          curatorId: true,
          id: true,
          referralSlug: true,
          userId: true
        },
        where: {
          OR: buildClientIdentityWhere({
            email,
            phone,
            sourceDomain,
            telegram
          })
        }
      });

      if (existingClient?.userId) {
        throw new Error("CLIENT_PROFILE_ALREADY_REGISTERED");
      }

      const user = await tx.user.create({
        data: {
          active: true,
          email,
          name: parsed.data.name,
          passwordHash,
          role: UserRole.CLIENT
        },
        select: { id: true }
      });

      const now = new Date();
      const referralSlug =
        normalizeOptional(existingClient?.referralSlug) ||
        requestedReferralSlug ||
        curator.slug;
      const curatorId = existingClient?.referralSlug
        ? existingClient.curatorId
        : curator.id;
      const clientData = {
        consentMailings,
        consentMailingsAt: consentMailings ? now : undefined,
        consentMailingsSource: consentMailings
          ? "client-registration"
          : undefined,
        consentPersonalData: true,
        curatorId,
        email,
        lastVisitedAt: now,
        name: parsed.data.name,
        phone,
        referralSlug,
        source: "client-registration",
        sourceDomain,
        status: ClientFunnelStatus.VISITED,
        telegram,
        userId: user.id
      } satisfies Prisma.ClientProfileUncheckedUpdateInput;

      const client = existingClient
        ? await tx.clientProfile.update({
            where: { id: existingClient.id },
            data: clientData,
            select: { id: true }
          })
        : await tx.clientProfile.create({
            data: clientData,
            select: { id: true }
          });

      await recordClientFunnelEvent(tx, {
        clientId: client.id,
        curatorId: curatorId ?? undefined,
        referralSlug,
        source: "client-registration",
        status: ClientFunnelStatus.VISITED
      });

      return { clientId: client.id, userId: user.id };
    });

    await setAuthSession(userId);
    await setClientSession(clientId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CLIENT_PROFILE_ALREADY_REGISTERED"
    ) {
      return {
        error:
          "Профиль с такими контактами уже зарегистрирован. Войдите в кабинет."
      };
    }

    console.error("Client registration failed");

    return { error: "Не удалось зарегистрироваться. Попробуйте позже." };
  }

  redirect("/client");
}
