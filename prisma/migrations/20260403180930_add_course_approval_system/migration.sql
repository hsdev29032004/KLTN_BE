-- CreateEnum
CREATE TYPE "CourseApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CourseStatus" ADD VALUE 'rejected';
ALTER TYPE "CourseStatus" ADD VALUE 'need_update';

-- CreateTable
CREATE TABLE "course_approvals" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CourseApprovalStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_approvals_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "course_approvals" ADD CONSTRAINT "course_approvals_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_approvals" ADD CONSTRAINT "course_approvals_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_approvals" ADD CONSTRAINT "course_approvals_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
