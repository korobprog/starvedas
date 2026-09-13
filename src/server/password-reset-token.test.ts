import { describe, expect, it } from "vitest";
import {
  canResetPasswordByEmail,
  generatePasswordResetToken,
  getPasswordResetTokenState,
  hashPasswordResetToken,
  isPasswordResetRateLimited,
  isSessionRevokedByPasswordChange
} from "@/server/password-reset-token";

describe("generatePasswordResetToken", () => {
  it("returns a random token whose hash matches hashPasswordResetToken", () => {
    const first = generatePasswordResetToken();
    const second = generatePasswordResetToken();

    expect(first.token).not.toBe(second.token);
    expect(first.token.length).toBeGreaterThanOrEqual(43);
    expect(first.tokenHash).toBe(hashPasswordResetToken(first.token));
    expect(first.tokenHash).not.toBe(first.token);
  });
});

describe("getPasswordResetTokenState", () => {
  const now = new Date("2026-09-13T10:00:00Z");

  it("accepts an unused token before expiry", () => {
    expect(
      getPasswordResetTokenState(
        { expiresAt: new Date("2026-09-13T10:30:00Z"), usedAt: null },
        now
      )
    ).toBe("valid");
  });

  it("rejects an expired token", () => {
    expect(
      getPasswordResetTokenState({ expiresAt: now, usedAt: null }, now)
    ).toBe("expired");
  });

  it("rejects a token that was already used", () => {
    expect(
      getPasswordResetTokenState(
        {
          expiresAt: new Date("2026-09-13T10:30:00Z"),
          usedAt: new Date("2026-09-13T09:55:00Z")
        },
        now
      )
    ).toBe("used");
  });
});

describe("canResetPasswordByEmail", () => {
  it("allows every role except super admin", () => {
    expect(canResetPasswordByEmail("CLIENT")).toBe(true);
    expect(canResetPasswordByEmail("CURATOR")).toBe(true);
    expect(canResetPasswordByEmail("STATISTICIAN")).toBe(true);
    expect(canResetPasswordByEmail("MANAGER")).toBe(true);
    expect(canResetPasswordByEmail("ADMIN")).toBe(true);
    expect(canResetPasswordByEmail("SUPER_ADMIN")).toBe(false);
  });
});

describe("isPasswordResetRateLimited", () => {
  it("blocks the fourth request inside the window", () => {
    expect(isPasswordResetRateLimited(2)).toBe(false);
    expect(isPasswordResetRateLimited(3)).toBe(true);
  });
});

describe("isSessionRevokedByPasswordChange", () => {
  const changedAt = new Date("2026-09-13T10:00:00Z");

  it("keeps sessions when the password was never changed", () => {
    expect(isSessionRevokedByPasswordChange(undefined, null)).toBe(false);
  });

  it("revokes sessions issued before the change", () => {
    expect(
      isSessionRevokedByPasswordChange(changedAt.getTime() - 1, changedAt)
    ).toBe(true);
  });

  it("revokes legacy sessions without an issue time", () => {
    expect(isSessionRevokedByPasswordChange(undefined, changedAt)).toBe(true);
  });

  it("keeps sessions issued after the change", () => {
    expect(
      isSessionRevokedByPasswordChange(changedAt.getTime() + 1, changedAt)
    ).toBe(false);
  });
});
