CREATE TABLE "ClientVideoMaterial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientVideoMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientVideoMaterial_active_sortOrder_createdAt_idx" ON "ClientVideoMaterial"("active", "sortOrder", "createdAt");
