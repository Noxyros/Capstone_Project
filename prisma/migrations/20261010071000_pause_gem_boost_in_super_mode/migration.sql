ALTER TABLE "User" ADD COLUMN "doubleXpPausedAt" TIMESTAMP(3);

UPDATE "User"
SET "doubleXpPausedAt" = CURRENT_TIMESTAMP
WHERE "superMode" = TRUE AND "doubleXpUntil" > CURRENT_TIMESTAMP;
