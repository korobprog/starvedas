import { NextResponse, type NextRequest } from "next/server";
import { getMaintenanceSettings } from "@/server/site-settings";

const PUBLIC_FILE = /\.(.*)$/;

function isMaintenanceAllowedPath(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMaintenanceAllowedPath(pathname)) {
    return NextResponse.next();
  }

  try {
    const status = await getMaintenanceSettings();

    if (status.mode) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      url.search = "";

      return NextResponse.rewrite(url);
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
