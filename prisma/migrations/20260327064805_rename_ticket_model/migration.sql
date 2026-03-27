/*
  Warnings:

  - You are about to drop the `ticket_messages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tickets` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ticket_messages" DROP CONSTRAINT "ticket_messages_senderId_fkey";

-- DropForeignKey
ALTER TABLE "ticket_messages" DROP CONSTRAINT "ticket_messages_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_senderId_fkey";

-- DropTable
DROP TABLE "ticket_messages";

-- DropTable
DROP TABLE "tickets";

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_courseId_key" ON "conversations"("courseId");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
