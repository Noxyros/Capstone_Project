BEGIN;

DROP INDEX "DailyQuiz_date_key";

ALTER TABLE "DailyQuiz"
ADD COLUMN "userId" TEXT,
ADD COLUMN "monthKey" VARCHAR(7),
ADD COLUMN "questionKey" TEXT,
ADD COLUMN "sourceQuestionId" TEXT,
ADD COLUMN "subjectName" TEXT,
ADD COLUMN "gradeLevel" INTEGER;

CREATE UNIQUE INDEX "DailyQuiz_userId_date_key"
ON "DailyQuiz"("userId", "date");
CREATE UNIQUE INDEX "DailyQuiz_userId_monthKey_questionKey_key"
ON "DailyQuiz"("userId", "monthKey", "questionKey");
CREATE UNIQUE INDEX "DailyQuiz_userId_monthKey_sourceQuestionId_key"
ON "DailyQuiz"("userId", "monthKey", "sourceQuestionId");
CREATE INDEX "DailyQuiz_userId_monthKey_idx"
ON "DailyQuiz"("userId", "monthKey");

ALTER TABLE "DailyQuiz"
ADD CONSTRAINT "DailyQuiz_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
