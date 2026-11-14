ALTER TABLE "Question"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageAlt" TEXT;

ALTER TABLE "DailyChallengeQuestion"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageAlt" TEXT;
