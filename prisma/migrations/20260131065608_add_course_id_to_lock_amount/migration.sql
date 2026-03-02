/*
  Warnings:

  - Added the required column `courseId` to the `lock_amounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "lock_amounts" ADD COLUMN     "courseId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "lock_amounts" ADD CONSTRAINT "lock_amounts_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
