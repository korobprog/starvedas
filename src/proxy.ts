import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

function isMaintenanceAllowedPath(pathname: string) {
  return (
    pathname === "/maintenance" ||
    pathname === "/login" ||
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
    const statusUrl = new URL("/api/maintenance-status", request.url);
    const response = await fetch(statusUrl, {
      cache: "no-store",
      headers: {
        "x-maintenance-check": "1"
      }
    });

    if (!response.ok) {
      return NextResponse.next();
    }

    const status = (await response.json()) as { mode?: boolean };

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
