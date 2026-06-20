import { ClientFunnelStatus } from "@prisma/client";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentClientProfile } from "@/server/client-auth";
import {
  invalidPhoneMessage,
  isPhoneCountryCode,
  isValidPhoneNumberForCountry,
  normalizePhoneNumber
} from "@/lib/phone-validation";
import {
  recordClientFunnelEvent,
  upsertClientProfileForFunnel
} from "@/server/client-profiles";
import { getCuratorForReferral, referralCookieName } from "@/server/referrals";
import { getSourceDomainFromHeaders } from "@/server/source-domain";

const visitorCookieName = "starvedas_visitor";
const visitorCookieMaxAge = 60 * 60 * 24 * 180;

const clientEventSchema = z
  .object({
    consentMailings: z.boolean().default(false),
    consentPersonalData: z.boolean().default(false),
    customerEmail: z.string().trim().max(200).optional(),
    customerName: z.string().trim().max(120).optional(),
    customerPhone: z.string().trim().max(50).optional(),
    customerPhoneCountry: z
      .string()
      .trim()
      .optional()
      .refine((country) => !country || isPhoneCountryCode(country), {
        message: "Некорректная страна телефона"
      }),
    customerTelegram: z.string().trim().max(120).optional(),
    referralSlug: z.string().trim().max(120).optional(),
    status: z.enum(["VISITED", "STARTED_CHECKOUT"])
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
  });

function hasContact(data: z.infer<typeof clientEventSchema>) {
  return Boolean(
    data.customerTelegram?.trim() ||
    data.customerPhone?.trim() ||
    data.customerEmail?.trim()
  );
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = clientEventSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Некорректные данные" },
      { status: 400 }
    );
  }

  const sourceDomain = getSourceDomainFromHeaders(request.headers);
  const cookieStore = await cookies();
  const visitorId =
    cookieStore.get(visitorCookieName)?.value || crypto.randomUUID();
  const referralSlug =
    parsed.data.referralSlug || cookieStore.get(referralCookieName)?.value;
  const curator = await getCuratorForReferral(referralSlug);
  const currentClient = await getCurrentClientProfile();
  const consentMailings = curator.showMailingConsentCheckbox
    ? parsed.data.consentMailings
    : false;

  await prisma.$transaction(async (tx) => {
    if (
      parsed.data.status === ClientFunnelStatus.STARTED_CHECKOUT &&
      parsed.data.customerName?.trim() &&
      hasContact(parsed.data)
    ) {
      await upsertClientProfileForFunnel(tx, {
        clientId: currentClient?.id,
        consentMailings,
        consentMailingsSource: "checkout",
        consentPersonalData: parsed.data.consentPersonalData,
        curatorId: curator.id,
        email: parsed.data.customerEmail,
        name: parsed.data.customerName,
        phone: normalizePhoneNumber(
          parsed.data.customerPhone,
          parsed.data.customerPhoneCountry
        ),
        referralSlug,
        source: "site",
        sourceDomain,
        status: ClientFunnelStatus.STARTED_CHECKOUT,
        telegram: parsed.data.customerTelegram,
        telegramId: currentClient?.telegramId,
        visitorId
      });
      return;
    }

    await recordClientFunnelEvent(tx, {
      curatorId: curator.id,
      referralSlug,
      source: "site",
      status: parsed.data.status,
      visitorId
    });
  });

  const response = NextResponse.json({ ok: true });

  response.cookies.set(visitorCookieName, visitorId, {
    httpOnly: true,
    maxAge: visitorCookieMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
