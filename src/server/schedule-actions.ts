"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/auth";

const scheduleSchema = z.object({
  active: z.coerce.boolean().default(false),
  body: z.string().trim().min(10),
  id: z.string().trim().optional(),
  month: z.string().trim().min(2),
  title: z.string().trim().min(2)
});

export async function saveSchedule(formData: FormData) {
  await requireAdminUser("/admin/schedule");

  const parsed = scheduleSchema.safeParse({
    active: formData.get("active") === "on",
    body: formData.get("body"),
    id: formData.get("id") || undefined,
    month: formData.get("month"),
    title: formData.get("title")
  });

  if (!parsed.success) {
    throw new Error("Некорректные данные расписания");
  }

  const data = parsed.data;

  if (data.active) {
    await prisma.schedule.updateMany({
      data: { active: false },
      where: data.id ? { id: { not: data.id } } : undefined
    });
  }

  if (data.id) {
    await prisma.schedule.update({
      data: {
        active: data.active,
        body: data.body,
        month: data.month,
        title: data.title
      },
      where: { id: data.id }
    });
  } else {
    await prisma.schedule.create({
      data: {
        active: data.active,
        body: data.body,
        month: data.month,
        title: data.title
      }
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/schedule");
}
