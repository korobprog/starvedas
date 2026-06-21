import { NextResponse } from "next/server";
import {
  findActiveCuratorByReferralSlug,
  getReferralPublicOrigin,
  normalizeReferralSlug,
  referralCookieMaxAge,
  referralCookieName
} from "@/server/referrals";

function getPublicOrigin(request: Request) {
  const referralOrigin = getReferralPublicOrigin();

  if (referralOrigin) {
    return referralOrigin;
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  let configuredOriginUrl: URL | null = null;

  if (configuredOrigin) {
    try {
      configuredOriginUrl = new URL(configuredOrigin);
    } catch {
      configuredOriginUrl = null;
    }
  }

  if (configuredOriginUrl) {
    return configuredOriginUrl.origin;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0];
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0];
  const host = forwardedHost?.trim() || request.headers.get("host");
  const protocol =
    forwardedProto?.trim() || requestUrl.protocol.replace(":", "");

  return host ? `${protocol}://${host}` : requestUrl.origin;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const referralSlug = normalizeReferralSlug(slug);
  const existingReferralSlug = normalizeReferralSlug(
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${referralCookieName}=`))
      ?.split("=")[1]
  );
  const existingCurator = existingReferralSlug
    ? await findActiveCuratorByReferralSlug(existingReferralSlug).catch(
        () => null
      )
    : null;
  const requestedCurator = await findActiveCuratorByReferralSlug(
    referralSlug
  ).catch(() => null);
  const appliedReferralSlug = existingCurator
    ? existingReferralSlug
    : requestedCurator
      ? referralSlug
      : "";
  const curator = existingCurator ?? requestedCurator;
  const target = new URL("/", getPublicOrigin(request));

  if (curator && appliedReferralSlug) {
    target.searchParams.set("ref", appliedReferralSlug);
    target.hash = "signup";
  }

  const response = NextResponse.redirect(target);

  if (curator && appliedReferralSlug && !existingCurator) {
    response.cookies.set(referralCookieName, appliedReferralSlug, {
      httpOnly: true,
      maxAge: referralCookieMaxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
  } else {
    response.cookies.delete(referralCookieName);
  }

  return response;
}
