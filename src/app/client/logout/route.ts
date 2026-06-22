import { NextResponse } from "next/server";
import { authSessionCookieName } from "@/server/auth";
import { clientSessionCookieName } from "@/server/client-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/client", request.url));

  response.cookies.delete(authSessionCookieName);
  response.cookies.delete(clientSessionCookieName);

  return response;
}
