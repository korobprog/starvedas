import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const clientVideoMaterialSelect = {
  active: true,
  createdAt: true,
  description: true,
  id: true,
  sortOrder: true,
  title: true,
  updatedAt: true,
  videoUrl: true
} satisfies Prisma.ClientVideoMaterialSelect;

export type ClientVideoMaterial = Prisma.ClientVideoMaterialGetPayload<{
  select: typeof clientVideoMaterialSelect;
}>;

export function getManagedClientVideoMaterials() {
  return prisma.clientVideoMaterial.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: clientVideoMaterialSelect
  });
}

export function getPublicClientVideoMaterials() {
  return prisma.clientVideoMaterial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: clientVideoMaterialSelect,
    where: {
      active: true
    }
  });
}
