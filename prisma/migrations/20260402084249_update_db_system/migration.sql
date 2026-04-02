/*
  Warnings:

  - You are about to drop the column `limitRefund` on the `systems` table. All the data in the column will be lost.
  - You are about to drop the column `timeRefund` on the `systems` table. All the data in the column will be lost.
  - You are about to drop the column `lockAmount` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "systems" DROP COLUMN "limitRefund",
DROP COLUMN "timeRefund",
ADD COLUMN     "contact" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "lockAmount";
