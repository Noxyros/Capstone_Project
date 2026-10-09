BEGIN;

ALTER TABLE "PowerUp"
RENAME COLUMN "costXp" TO "costGems";
ALTER TABLE "PowerUp"
ALTER COLUMN "costGems" DROP DEFAULT;

ALTER TABLE "User"
ADD COLUMN "gems" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "superMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastActivityDate" VARCHAR(10);

CREATE TABLE "RewardEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "xpDelta" INTEGER NOT NULL DEFAULT 0,
  "gemsDelta" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuizAnswer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "selectedOptionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isCorrect" BOOLEAN NOT NULL,
  "heartLost" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityDay" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" VARCHAR(10) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RewardEvent_userId_idempotencyKey_key"
ON "RewardEvent"("userId", "idempotencyKey");
CREATE INDEX "RewardEvent_userId_createdAt_idx"
ON "RewardEvent"("userId", "createdAt");

CREATE INDEX "QuizAttempt_userId_nodeId_startedAt_idx"
ON "QuizAttempt"("userId", "nodeId", "startedAt");

CREATE UNIQUE INDEX "QuizAnswer_attemptId_questionId_key"
ON "QuizAnswer"("attemptId", "questionId");
CREATE INDEX "QuizAnswer_userId_createdAt_idx"
ON "QuizAnswer"("userId", "createdAt");

CREATE UNIQUE INDEX "ActivityDay_userId_date_key"
ON "ActivityDay"("userId", "date");
CREATE INDEX "ActivityDay_userId_date_idx"
ON "ActivityDay"("userId", "date");

ALTER TABLE "RewardEvent"
ADD CONSTRAINT "RewardEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAttempt"
ADD CONSTRAINT "QuizAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt"
ADD CONSTRAINT "QuizAttempt_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "RoadmapNode"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuizAnswer"
ADD CONSTRAINT "QuizAnswer_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer"
ADD CONSTRAINT "QuizAnswer_attemptId_fkey"
FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer"
ADD CONSTRAINT "QuizAnswer_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityDay"
ADD CONSTRAINT "ActivityDay_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
