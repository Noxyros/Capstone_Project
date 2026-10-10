CREATE TABLE "Submodule" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  "summaryText" TEXT NOT NULL DEFAULT '',
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "chapterId" TEXT NOT NULL,
  CONSTRAINT "Submodule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Submodule_chapterId_order_key" ON "Submodule"("chapterId", "order");
CREATE INDEX "Submodule_chapterId_idx" ON "Submodule"("chapterId");

ALTER TABLE "Submodule"
ADD CONSTRAINT "Submodule_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoadmapNode" ADD COLUMN "submoduleId" TEXT;
CREATE INDEX "RoadmapNode_submoduleId_order_idx" ON "RoadmapNode"("submoduleId", "order");

ALTER TABLE "RoadmapNode"
ADD CONSTRAINT "RoadmapNode_submoduleId_fkey"
FOREIGN KEY ("submoduleId") REFERENCES "Submodule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
