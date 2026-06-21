import { NextResponse } from "next/server";
import {
  findActiveCuratorByReferralSlug,
  normalizeReferralSlug,
  referralCookieMaxAge,
  referralCookieName
} from "@/server/referrals";

const clientReferralOrigin = "https://chintamanidhama.ru";

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
  const target = new URL("/", clientReferralOrigin);

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
