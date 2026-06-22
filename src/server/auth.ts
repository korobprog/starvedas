import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { organizationSettingsId } from "@/server/organization-settings";

export const authSessionCookieName = "starvedas_session";

const sessionMaxAgeSeconds = 60 * 60 * 24 * 14;

type SessionPayload = {
  exp: number;
  userId: string;
};

function getSessionSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "starvedas-local-session-secret"
  );
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function createSessionToken(payload: SessionPayload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${data}.${sign(data)}`;
}

function parseSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [data, signature] = token.split(".");

  if (!data || !signature || sign(data) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;

    if (!payload.userId || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setAuthSession(userId: string) {
  const cookieStore = await cookies();
  const token = createSessionToken({
    exp: Date.now() + sessionMaxAgeSeconds * 1000,
    userId
  });

  cookieStore.set(authSessionCookieName, token, {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();

  cookieStore.delete(authSessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const payload = parseSessionToken(
    cookieStore.get(authSessionCookieName)?.value
  );

  if (!payload) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      active: true,
      id: payload.userId
    },
    select: {
      curator: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      email: true,
      id: true,
      name: true,
      role: true
    }
  });
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getCurrentUser>>
>;

export async function canManageServices(): Promise<{
  user: SessionUser;
  reason: "admin" | "curator-allowed";
} | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  if (isAdminRole(user.role)) {
    return { reason: "admin", user };
  }

  if (user.role !== UserRole.CURATOR) {
    return null;
  }

  const settings = await prisma.organizationSettings.findUnique({
    where: { id: organizationSettingsId },
    select: {
      allowCuratorManageServices: true
    }
  });

  if (!settings?.allowCuratorManageServices) {
    return null;
  }

  return { reason: "curator-allowed", user };
}

export async function requireUser(
  roles: UserRole[],
  nextPath = "/admin/curators"
) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!roles.includes(user.role)) {
    redirect(getDefaultUserPath(user.role));
  }

  return user;
}

export function isAdminRole(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function isSuperAdminRole(role: UserRole) {
  return role === UserRole.SUPER_ADMIN;
}

export async function requireAdminUser(nextPath = "/admin/curators") {
  return requireUser([UserRole.ADMIN, UserRole.SUPER_ADMIN], nextPath);
}

export async function requireSuperAdminUser(nextPath = "/admin/curators") {
  return requireUser([UserRole.SUPER_ADMIN], nextPath);
}

export async function requireServiceManager(nextPath = "/cabinet") {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const access = await canManageServices();

  if (!access) {
    throw new Error("Недостаточно прав");
  }

  return access;
}

export function getDefaultUserPath(role: UserRole) {
  if (isAdminRole(role)) {
    return "/admin/curators";
  }

  if (role === UserRole.STATISTICIAN) {
    return "/statistician";
  }

  if (role === UserRole.CLIENT) {
    return "/client";
  }

  return "/cabinet";
}
