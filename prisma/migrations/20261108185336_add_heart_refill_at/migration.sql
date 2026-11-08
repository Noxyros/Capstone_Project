-- AlterTable
ALTER TABLE "DailyQuiz" ALTER COLUMN "title" SET DEFAULT 'Daily Challenge';

-- AlterTable
ALTER TABLE "QuizAnswer" ALTER COLUMN "selectedOptionIds" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "heartRefillAt" TIMESTAMP(3);
