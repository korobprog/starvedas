-- CreateEnum
CREATE TYPE "PartnerApplicationType" AS ENUM ('IP', 'SELF_EMPLOYED');

-- CreateEnum
CREATE TYPE "PartnerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "OrganizationSettings" ADD COLUMN "partnerProgramAgreementText" TEXT;

-- CreateTable
CREATE TABLE "CuratorPartnerApplication" (
    "id" TEXT NOT NULL,
    "type" "PartnerApplicationType" NOT NULL,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "fullName" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "ogrnip" TEXT,
    "registrationAddress" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "bankDetails" TEXT,
    "comment" TEXT,
    "rulesAccepted" BOOLEAN NOT NULL DEFAULT false,
    "adminComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "curatorId" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "CuratorPartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratorPartnerApplication_curatorId_key" ON "CuratorPartnerApplication"("curatorId");

-- CreateIndex
CREATE INDEX "CuratorPartnerApplication_status_createdAt_idx" ON "CuratorPartnerApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CuratorPartnerApplication_reviewedById_idx" ON "CuratorPartnerApplication"("reviewedById");

-- AddForeignKey
ALTER TABLE "CuratorPartnerApplication" ADD CONSTRAINT "CuratorPartnerApplication_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratorPartnerApplication" ADD CONSTRAINT "CuratorPartnerApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
