-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('easy', 'normal', 'hard');

-- AlterTable
ALTER TABLE "exam_questions" ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'normal';

-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "numEasy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numHard" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "numNormal" INTEGER NOT NULL DEFAULT 0;
