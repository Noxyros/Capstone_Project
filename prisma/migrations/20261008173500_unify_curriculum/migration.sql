BEGIN;

ALTER TABLE "CurriculumChapter" DROP CONSTRAINT "CurriculumChapter_subjectId_fkey";
ALTER TABLE "CurriculumSubject" DROP CONSTRAINT "CurriculumSubject_teacherId_fkey";
ALTER TABLE "Question" DROP CONSTRAINT "Question_chapterId_fkey";
ALTER TABLE "RoadmapNode" DROP CONSTRAINT "RoadmapNode_chapterId_fkey";
ALTER TABLE "RoadmapOption" DROP CONSTRAINT "RoadmapOption_questionId_fkey";
ALTER TABLE "RoadmapQuestion" DROP CONSTRAINT "RoadmapQuestion_nodeId_fkey";

DROP INDEX "RoadmapNode_chapterId_idx";

ALTER TABLE "Subject"
ADD COLUMN "color" TEXT NOT NULL DEFAULT 'blue',
ADD COLUMN "createdById" TEXT;

ALTER TABLE "Chapter"
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "RoadmapNode"
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

UPDATE "RoadmapNode"
SET "isPublished" = ("status" <> 'LOCKED'::"RoadmapNodeStatus");

ALTER TABLE "Question"
ADD COLUMN "nodeId" TEXT;

INSERT INTO "RoadmapNode" (
  "id",
  "title",
  "order",
  "type",
  "contentType",
  "content",
  "resourceUrl",
  "isPublished",
  "chapterId",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy-quiz-' || question_chapters."chapterId",
  'Chapter Quiz',
  COALESCE(MAX(existing_nodes."order"), 0) + 1,
  'QUIZ'::"RoadmapNodeType",
  'TEXT'::"RoadmapContentType",
  '',
  '',
  true,
  question_chapters."chapterId",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT "chapterId"
  FROM "Question"
) AS question_chapters
LEFT JOIN "RoadmapNode" AS existing_nodes
  ON existing_nodes."chapterId" = question_chapters."chapterId"
GROUP BY question_chapters."chapterId";

UPDATE "Question"
SET "nodeId" = 'legacy-quiz-' || "chapterId";

ALTER TABLE "Question"
ALTER COLUMN "nodeId" SET NOT NULL,
DROP COLUMN "chapterId";

ALTER TABLE "RoadmapNode"
DROP COLUMN "status";

DROP TABLE "CurriculumChapter";
DROP TABLE "CurriculumSubject";
DROP TABLE "RoadmapOption";
DROP TABLE "RoadmapQuestion";

DROP TYPE "CurriculumChapterStatus";
DROP TYPE "RoadmapNodeStatus";

CREATE TABLE "SubjectEnrollment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubjectEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NodeProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "bestScore" INTEGER,
  CONSTRAINT "NodeProgress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Subject_createdById_idx" ON "Subject"("createdById");
CREATE INDEX "Chapter_subjectId_order_idx" ON "Chapter"("subjectId", "order");
CREATE INDEX "RoadmapNode_chapterId_order_idx" ON "RoadmapNode"("chapterId", "order");
CREATE INDEX "Question_nodeId_idx" ON "Question"("nodeId");
CREATE INDEX "SubjectEnrollment_subjectId_idx" ON "SubjectEnrollment"("subjectId");
CREATE UNIQUE INDEX "SubjectEnrollment_studentId_subjectId_key"
  ON "SubjectEnrollment"("studentId", "subjectId");
CREATE INDEX "NodeProgress_nodeId_idx" ON "NodeProgress"("nodeId");
CREATE UNIQUE INDEX "NodeProgress_userId_nodeId_key"
  ON "NodeProgress"("userId", "nodeId");

ALTER TABLE "Subject"
ADD CONSTRAINT "Subject_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RoadmapNode"
ADD CONSTRAINT "RoadmapNode_chapterId_fkey"
FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Question"
ADD CONSTRAINT "Question_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "RoadmapNode"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectEnrollment"
ADD CONSTRAINT "SubjectEnrollment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubjectEnrollment"
ADD CONSTRAINT "SubjectEnrollment_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NodeProgress"
ADD CONSTRAINT "NodeProgress_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NodeProgress"
ADD CONSTRAINT "NodeProgress_nodeId_fkey"
FOREIGN KEY ("nodeId") REFERENCES "RoadmapNode"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
