import { UserRole } from "@prisma/client";
import type { SessionUser } from "@/server/auth";
import { ensureSystemCurator } from "@/server/referrals";

export async function getCabinetCuratorIdForSessionUser(
  user: Pick<SessionUser, "curator" | "role">
) {
  if (user.role === UserRole.CURATOR) {
    return user.curator?.id ?? null;
  }

  if (user.curator?.id) {
    return user.curator.id;
  }

  return (await ensureSystemCurator()).id;
}
