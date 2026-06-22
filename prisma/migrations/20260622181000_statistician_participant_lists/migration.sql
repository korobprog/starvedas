-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'STATISTICIAN';

-- CreateEnum
CREATE TYPE "ParticipantListStatus" AS ENUM ('NEW', 'IN_WORK', 'NEEDS_CLARIFICATION', 'CHECKED', 'READY_TO_SEND', 'SENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ParticipantRowStatus" AS ENUM ('NEW', 'CHECKED', 'ERROR', 'DUPLICATE', 'UPDATED', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "ParticipantListMessageRole" AS ENUM ('CURATOR', 'STATISTICIAN', 'ADMIN', 'SYSTEM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- AlterTable
ALTER TABLE "OrderParticipant" ADD COLUMN "rowStatus" "ParticipantRowStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "statisticianComment" TEXT;

-- CreateTable
CREATE TABLE "ParticipantList" (
    "id" TEXT NOT NULL,
    "status" "ParticipantListStatus" NOT NULL DEFAULT 'NEW',
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "serviceTitleOverride" TEXT,
    "eventStartsAt" TIMESTAMP(3),
    "note" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "ParticipantList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantListMessage" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderRole" "ParticipantListMessageRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listId" TEXT NOT NULL,
    "senderId" TEXT,

    CONSTRAINT "ParticipantListMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantListChange" (
    "id" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listId" TEXT NOT NULL,
    "changedById" TEXT,

    CONSTRAINT "ParticipantListChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantList_orderId_key" ON "ParticipantList"("orderId");

-- CreateIndex
CREATE INDEX "ParticipantList_status_idx" ON "ParticipantList"("status");

-- CreateIndex
CREATE INDEX "ParticipantList_bookmarked_idx" ON "ParticipantList"("bookmarked");

-- CreateIndex
CREATE INDEX "ParticipantList_eventStartsAt_idx" ON "ParticipantList"("eventStartsAt");

-- CreateIndex
CREATE INDEX "ParticipantList_updatedAt_idx" ON "ParticipantList"("updatedAt");

-- CreateIndex
CREATE INDEX "ParticipantListMessage_listId_createdAt_idx" ON "ParticipantListMessage"("listId", "createdAt");

-- CreateIndex
CREATE INDEX "ParticipantListMessage_senderId_idx" ON "ParticipantListMessage"("senderId");

-- CreateIndex
CREATE INDEX "ParticipantListChange_listId_createdAt_idx" ON "ParticipantListChange"("listId", "createdAt");

-- CreateIndex
CREATE INDEX "ParticipantListChange_changedById_idx" ON "ParticipantListChange"("changedById");

-- AddForeignKey
ALTER TABLE "ParticipantList" ADD CONSTRAINT "ParticipantList_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantListMessage" ADD CONSTRAINT "ParticipantListMessage_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ParticipantList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantListMessage" ADD CONSTRAINT "ParticipantListMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantListChange" ADD CONSTRAINT "ParticipantListChange_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ParticipantList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantListChange" ADD CONSTRAINT "ParticipantListChange_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


