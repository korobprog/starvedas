import { NextResponse } from "next/server";
import {
  findActiveCuratorByReferralSlug,
  normalizeReferralSlug,
  referralCookieMaxAge,
  referralCookieName
} from "@/server/referrals";

function getPublicOrigin(request: Request) {
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
  const curator = await findActiveCuratorByReferralSlug(referralSlug).catch(
    () => null
  );
  const target = new URL("/", getPublicOrigin(request));

  if (curator) {
    target.searchParams.set("ref", referralSlug);
    target.hash = "signup";
  }

  const response = NextResponse.redirect(target);

  if (curator) {
    response.cookies.set(referralCookieName, referralSlug, {
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
