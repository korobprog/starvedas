import { NextResponse } from "next/server";
import { authSessionCookieName } from "@/server/auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));

  response.cookies.delete(authSessionCookieName);

  return response;
}
