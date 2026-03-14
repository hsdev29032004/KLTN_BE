/*
  Warnings:

  - You are about to drop the `lock_amounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "lock_amounts" DROP CONSTRAINT "lock_amounts_courseId_fkey";

-- DropForeignKey
ALTER TABLE "lock_amounts" DROP CONSTRAINT "lock_amounts_userId_fkey";

-- DropTable
DROP TABLE "lock_amounts";
