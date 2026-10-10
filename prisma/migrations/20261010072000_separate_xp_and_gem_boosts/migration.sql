ALTER TABLE "User"
  ADD COLUMN "doubleGemsUntil" TIMESTAMP(3),
  ADD COLUMN "doubleGemsPausedAt" TIMESTAMP(3);

UPDATE "User"
SET
  "doubleGemsUntil" = "doubleXpUntil",
  "doubleGemsPausedAt" = "doubleXpPausedAt",
  "doubleXpUntil" = NULL
WHERE "doubleXpUntil" IS NOT NULL OR "doubleXpPausedAt" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "doubleXpPausedAt";
