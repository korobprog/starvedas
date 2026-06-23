import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { isAdminRole, type SessionUser } from "@/server/auth";

export const statisticianRoleCookieName = "starvedas_statistician_role";

const statisticianRoleMaxAgeSeconds = 60 * 60 * 24 * 14;

export function canAcceptStatisticianRole(role: UserRole) {
  return isAdminRole(role);
}

export async function acceptStatisticianRole() {
  const cookieStore = await cookies();

  cookieStore.set(statisticianRoleCookieName, "1", {
    httpOnly: true,
    maxAge: statisticianRoleMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearStatisticianRole() {
  const cookieStore = await cookies();

  cookieStore.delete(statisticianRoleCookieName);
}

export async function hasAcceptedStatisticianRole(
  user: Pick<SessionUser, "role">
) {
  if (user.role === UserRole.STATISTICIAN) {
    return true;
  }

  if (!canAcceptStatisticianRole(user.role)) {
    return false;
  }

  const cookieStore = await cookies();

  return cookieStore.get(statisticianRoleCookieName)?.value === "1";
}
