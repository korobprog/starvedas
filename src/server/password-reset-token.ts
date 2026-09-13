import crypto from "node:crypto";
import type { UserRole } from "@prisma/client";

export const passwordResetTokenTtlMs = 60 * 60 * 1000;
export const passwordResetRequestWindowMs = 15 * 60 * 1000;
export const maxPasswordResetRequestsPerWindow = 3;
export const minPasswordLength = 8;

export type PasswordResetTokenState = "expired" | "used" | "valid";

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export function generatePasswordResetToken() {
  const token = crypto.randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashPasswordResetToken(token)
  };
}

export function getPasswordResetTokenState(
  record: { expiresAt: Date; usedAt: Date | null },
  now = new Date()
): PasswordResetTokenState {
  if (record.usedAt) {
    return "used";
  }

  if (record.expiresAt.getTime() <= now.getTime()) {
    return "expired";
  }

  return "valid";
}

// Суперадминам пароль восстанавливают только вручную.
export function canResetPasswordByEmail(role: UserRole) {
  return role !== "SUPER_ADMIN";
}

export function isPasswordResetRateLimited(recentRequestCount: number) {
  return recentRequestCount >= maxPasswordResetRequestsPerWindow;
}

// Сессия, выданная до смены пароля, считается отозванной. Старые cookie без
// времени выдачи отзываются, как только пароль был сменён хотя бы раз.
export function isSessionRevokedByPasswordChange(
  issuedAt: number | undefined,
  passwordChangedAt: Date | null
) {
  if (!passwordChangedAt) {
    return false;
  }

  return !issuedAt || issuedAt < passwordChangedAt.getTime();
}
