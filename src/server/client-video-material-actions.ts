"use server";

import crypto from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/auth";

const uploadsPublicPath = "/uploads/client-videos";
const uploadsDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "client-videos"
);
const maxVideoSizeBytes = 240 * 1024 * 1024;
const allowedVideoExtensions = new Set([".mp4", ".webm", ".mov", ".m4v"]);

const materialSchema = z.object({
  active: z.boolean(),
  description: z.string().trim().max(2000).optional(),
  sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0),
  title: z.string().trim().min(2).max(160),
  videoUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        value.startsWith("https://") ||
        value.startsWith("http://"),
      {
        message: "Укажите ссылку https://... или путь /uploads/..."
      }
    )
});

const idSchema = z.object({
  id: z.string().trim().min(1)
});

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    "size" in value
  );
}

function getUploadedVideo(formData: FormData) {
  const file = formData.get("videoFile");

  if (!isUploadFile(file) || file.size === 0) {
    return null;
  }

  if (file.size > maxVideoSizeBytes) {
    throw new Error("Видео слишком большое. Максимум — 240 МБ.");
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!allowedVideoExtensions.has(extension)) {
    throw new Error("Поддерживаются только MP4, WEBM, MOV или M4V.");
  }

  if (file.type && !file.type.startsWith("video/")) {
    throw new Error("Файл должен быть видео.");
  }

  return file;
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const baseName =
    path
      .basename(fileName, extension)
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "video";

  return `${baseName}${extension}`;
}

async function saveUploadedVideo(file: File) {
  await mkdir(uploadsDirectory, { recursive: true });

  const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${sanitizeFileName(
    file.name
  )}`;
  const filePath = path.join(uploadsDirectory, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  return `${uploadsPublicPath}/${fileName}`;
}

async function deleteUploadedVideoIfLocal(videoUrl: string | null | undefined) {
  if (!videoUrl?.startsWith(`${uploadsPublicPath}/`)) {
    return;
  }

  const relativePath = videoUrl.replace(/^\//, "");
  const uploadRoot = path.resolve(uploadsDirectory);
  const filePath = path.resolve(process.cwd(), "public", relativePath);

  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    return;
  }

  try {
    await unlink(filePath);
  } catch {
    // Файл мог быть удален вручную или не существовать на текущем сервере.
  }
}

function parseMaterialForm(formData: FormData) {
  const parsed = materialSchema.safeParse({
    active: formData.get("active") === "on",
    description: formData.get("description") || undefined,
    sortOrder: formData.get("sortOrder") || 0,
    title: formData.get("title"),
    videoUrl: formData.get("videoUrl") || undefined
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Проверьте данные видео материала"
    );
  }

  return parsed.data;
}

function revalidateMaterialPages() {
  revalidatePath("/admin/client-materials");
  revalidatePath("/client");
  revalidatePath("/client/materials");
}

export async function createClientVideoMaterialAction(formData: FormData) {
  await requireAdminUser("/admin/client-materials");

  const data = parseMaterialForm(formData);
  const uploadedVideo = getUploadedVideo(formData);
  const videoUrl = uploadedVideo
    ? await saveUploadedVideo(uploadedVideo)
    : data.videoUrl;

  if (!videoUrl) {
    throw new Error("Загрузите видео или укажите ссылку на видео.");
  }

  await prisma.clientVideoMaterial.create({
    data: {
      active: data.active,
      description: data.description || null,
      sortOrder: data.sortOrder,
      title: data.title,
      videoUrl
    }
  });

  revalidateMaterialPages();
  redirect("/admin/client-materials?saved=1");
}

export async function updateClientVideoMaterialAction(formData: FormData) {
  await requireAdminUser("/admin/client-materials");

  const idParsed = idSchema.safeParse({ id: formData.get("id") });

  if (!idParsed.success) {
    throw new Error("Видео материал не найден.");
  }

  const currentMaterial = await prisma.clientVideoMaterial.findUnique({
    where: { id: idParsed.data.id },
    select: { videoUrl: true }
  });

  if (!currentMaterial) {
    throw new Error("Видео материал не найден.");
  }

  const data = parseMaterialForm(formData);
  const uploadedVideo = getUploadedVideo(formData);
  const videoUrl = uploadedVideo
    ? await saveUploadedVideo(uploadedVideo)
    : data.videoUrl;

  if (!videoUrl) {
    throw new Error("Загрузите видео или укажите ссылку на видео.");
  }

  await prisma.clientVideoMaterial.update({
    where: { id: idParsed.data.id },
    data: {
      active: data.active,
      description: data.description || null,
      sortOrder: data.sortOrder,
      title: data.title,
      videoUrl
    }
  });

  if (uploadedVideo) {
    await deleteUploadedVideoIfLocal(currentMaterial.videoUrl);
  }

  revalidateMaterialPages();
  redirect("/admin/client-materials?saved=1");
}

export async function deleteClientVideoMaterialAction(formData: FormData) {
  await requireAdminUser("/admin/client-materials");

  const parsed = idSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    throw new Error("Видео материал не найден.");
  }

  const material = await prisma.clientVideoMaterial.findUnique({
    where: { id: parsed.data.id },
    select: { videoUrl: true }
  });

  if (!material) {
    throw new Error("Видео материал не найден.");
  }

  await prisma.clientVideoMaterial.delete({
    where: { id: parsed.data.id }
  });
  await deleteUploadedVideoIfLocal(material.videoUrl);

  revalidateMaterialPages();
  redirect("/admin/client-materials?deleted=1");
}
