import { NextResponse } from "next/server";
import {
  findActiveCuratorByReferralSlug,
  normalizeReferralSlug,
  referralCookieMaxAge,
  referralCookieName
} from "@/server/referrals";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const referralSlug = normalizeReferralSlug(slug);
  const curator = await findActiveCuratorByReferralSlug(referralSlug);
  const target = new URL("/", request.url);

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
