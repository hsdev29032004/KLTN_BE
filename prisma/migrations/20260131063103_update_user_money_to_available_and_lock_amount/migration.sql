/*
  Warnings:

  - You are about to drop the column `money` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "money",
ADD COLUMN     "availableAmount" INTEGER DEFAULT 0,
ADD COLUMN     "lockAmount" INTEGER DEFAULT 0;
