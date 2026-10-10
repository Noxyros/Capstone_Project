BEGIN;

CREATE TABLE "DailyChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyChallengeQuestion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthKey" VARCHAR(7) NOT NULL,
    "questionKey" TEXT NOT NULL,
    "sourceQuestionId" TEXT,
    "position" INTEGER NOT NULL,
    "subjectName" TEXT NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    CONSTRAINT "DailyChallengeQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyChallengeOption" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "questionId" TEXT NOT NULL,
    CONSTRAINT "DailyChallengeOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyChallengeAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeQuestionId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyChallengeAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyChallenge_userId_date_key"
ON "DailyChallenge"("userId", "date");
CREATE UNIQUE INDEX "DailyChallengeQuestion_challengeId_position_key"
ON "DailyChallengeQuestion"("challengeId", "position");
CREATE UNIQUE INDEX "DailyChallengeQuestion_userId_monthKey_questionKey_key"
ON "DailyChallengeQuestion"("userId", "monthKey", "questionKey");
CREATE UNIQUE INDEX "DailyChallengeQuestion_userId_monthKey_sourceQuestionId_key"
ON "DailyChallengeQuestion"("userId", "monthKey", "sourceQuestionId");
CREATE INDEX "DailyChallengeQuestion_userId_monthKey_idx"
ON "DailyChallengeQuestion"("userId", "monthKey");
CREATE UNIQUE INDEX "DailyChallengeAnswer_userId_challengeQuestionId_key"
ON "DailyChallengeAnswer"("userId", "challengeQuestionId");

ALTER TABLE "DailyChallenge"
ADD CONSTRAINT "DailyChallenge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyChallengeQuestion"
ADD CONSTRAINT "DailyChallengeQuestion_challengeId_fkey"
FOREIGN KEY ("challengeId") REFERENCES "DailyChallenge"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyChallengeQuestion"
ADD CONSTRAINT "DailyChallengeQuestion_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyChallengeOption"
ADD CONSTRAINT "DailyChallengeOption_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "DailyChallengeQuestion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyChallengeAnswer"
ADD CONSTRAINT "DailyChallengeAnswer_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyChallengeAnswer"
ADD CONSTRAINT "DailyChallengeAnswer_challengeQuestionId_fkey"
FOREIGN KEY ("challengeQuestionId") REFERENCES "DailyChallengeQuestion"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
