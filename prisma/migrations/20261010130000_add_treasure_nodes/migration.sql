ALTER TYPE "RoadmapNodeType" ADD VALUE 'TREASURE';

CREATE TYPE "RoadmapRewardCurrency" AS ENUM ('XP', 'GEMS');

ALTER TABLE "RoadmapNode"
  ADD COLUMN "rewardCurrency" "RoadmapRewardCurrency",
  ADD COLUMN "rewardAmount" INTEGER;
