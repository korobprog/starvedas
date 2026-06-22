"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/auth";
import { hashPassword } from "@/server/password";

const statisticianSchema = z.object({
  active: z.boolean(),
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(120),
  password: z.string().trim().min(6).max(120).optional(),
  telegramId: z.string().trim().max(64).optional(),
  userId: z.string().trim().optional()
});

export async function saveStatisticianAction(formData: FormData) {
  await requireAdminUser("/admin/statisticians");

  const parsed = statisticianSchema.safeParse({
    active: formData.get("active") === "on",
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password") || undefined,
    telegramId: formData.get("telegramId") || undefined,
    userId: formData.get("userId") || undefined
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные статиста");
  }

  const data = parsed.data;
  const telegramId = data.telegramId || null;

  if (data.userId) {
    await prisma.user.update({
      data: {
        active: data.active,
        email: data.email,
        name: data.name,
        passwordHash: data.password
          ? await hashPassword(data.password)
          : undefined,
        role: UserRole.STATISTICIAN,
        telegramId
      },
      where: { id: data.userId }
    });
  } else {
    if (!data.password) {
      throw new Error("Для нового статиста нужен пароль");
    }

    await prisma.user.create({
      data: {
        active: data.active,
        email: data.email,
        name: data.name,
        passwordHash: await hashPassword(data.password),
        role: UserRole.STATISTICIAN,
        telegramId
      }
    });
  }

  revalidatePath("/admin/statisticians");
}
