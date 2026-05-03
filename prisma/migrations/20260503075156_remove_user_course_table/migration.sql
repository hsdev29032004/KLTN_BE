/*
  Warnings:

  - You are about to drop the `user_courses` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "user_courses" DROP CONSTRAINT "user_courses_courseId_fkey";

-- DropForeignKey
ALTER TABLE "user_courses" DROP CONSTRAINT "user_courses_userId_fkey";

-- DropTable
DROP TABLE "user_courses";
