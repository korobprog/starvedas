import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/server/email/mailer";
import { getSiteUrlForSourceDomain } from "@/server/email/site-url";
import { buildPasswordResetEmail } from "@/server/email/templates";
import { hashPassword } from "@/server/password";
import {
  canResetPasswordByEmail,
  generatePasswordResetToken,
  getPasswordResetTokenState,
  hashPasswordResetToken,
  isPasswordResetRateLimited,
  passwordResetRequestWindowMs,
  passwordResetTokenTtlMs
} from "@/server/password-reset-token";

const staleTokenRetentionMs = 24 * 60 * 60 * 1000;

export async function sendPasswordResetLink(rawEmail: string) {
  const email = rawEmail.trim();
  const user = await prisma.user.findFirst({
    where: {
      active: true,
      email: { equals: email, mode: "insensitive" }
    },
    orderBy: { createdAt: "asc" },
    select: {
      clientProfile: { select: { sourceDomain: true } },
      email: true,
      id: true,
      role: true
    }
  });

  if (!user || !canResetPasswordByEmail(user.role)) {
    return;
  }

  const now = Date.now();
  const recentRequestCount = await prisma.passwordResetToken.count({
    where: {
      createdAt: { gte: new Date(now - passwordResetRequestWindowMs) },
      userId: user.id
    }
  });

  if (isPasswordResetRateLimited(recentRequestCount)) {
    console.warn("Password reset rate limit reached");
    return;
  }

  const { token, tokenHash } = generatePasswordResetToken();
  const expiresAt = new Date(now + passwordResetTokenTtlMs);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        createdAt: { lt: new Date(now - staleTokenRetentionMs) },
        userId: user.id
      }
    }),
    // Новая ссылка отменяет предыдущие, но записи остаются для лимита запросов.
    prisma.passwordResetToken.updateMany({
      where: { usedAt: null, userId: user.id },
      data: { usedAt: new Date(now) }
    }),
    prisma.passwordResetToken.create({
      data: { expiresAt, tokenHash, userId: user.id }
    })
  ]);

  const resetUrl = `${getSiteUrlForSourceDomain(
    user.clientProfile?.sourceDomain
  )}/reset-password?token=${encodeURIComponent(token)}`;
  const template = buildPasswordResetEmail({ expiresAt, resetUrl });
  const result = await sendEmail({
    html: template.html,
    subject: template.subject,
    text: template.text,
    to: user.email
  });

  if (result.skipped && process.env.NODE_ENV !== "production") {
    console.info(`Password reset link (SMTP not configured): ${resetUrl}`);
  }
}

async function findUsableToken(rawToken: string) {
  if (!rawToken) {
    return null;
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(rawToken) },
    select: {
      expiresAt: true,
      id: true,
      usedAt: true,
      user: { select: { active: true, id: true, role: true } }
    }
  });

  if (
    !record ||
    getPasswordResetTokenState(record) !== "valid" ||
    !record.user.active ||
    !canResetPasswordByEmail(record.user.role)
  ) {
    return null;
  }

  return record;
}

export async function isPasswordResetTokenUsable(rawToken: string) {
  return Boolean(await findUsableToken(rawToken));
}

export async function resetPasswordWithToken(
  rawToken: string,
  password: string
): Promise<{ role: UserRole } | null> {
  const record = await findUsableToken(rawToken);

  if (!record) {
    return null;
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Условие usedAt: null не даёт использовать одну ссылку дважды параллельно.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now }
    });

    if (claimed.count !== 1) {
      return null;
    }

    await tx.user.update({
      where: { id: record.user.id },
      data: { passwordChangedAt: now, passwordHash }
    });
    await tx.passwordResetToken.updateMany({
      where: { usedAt: null, userId: record.user.id },
      data: { usedAt: now }
    });

    return { role: record.user.role };
  });
}
