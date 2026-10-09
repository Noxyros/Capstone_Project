-- CreateEnum
CREATE TYPE "CurriculumChapterStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'LOCKED');

-- CreateEnum
CREATE TYPE "RoadmapNodeType" AS ENUM ('LESSON', 'QUIZ');

-- CreateEnum
CREATE TYPE "RoadmapNodeStatus" AS ENUM ('LOCKED', 'CURRENT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "RoadmapContentType" AS ENUM ('TEXT', 'POSTER', 'MATERIAL');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEACHER';

-- CreateTable
CREATE TABLE "CurriculumSubject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumChapter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT NOT NULL,
    "chaptersStatus" "CurriculumChapterStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapNode" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "type" "RoadmapNodeType" NOT NULL,
    "status" "RoadmapNodeStatus" NOT NULL DEFAULT 'CURRENT',
    "contentType" "RoadmapContentType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "resourceUrl" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoadmapNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapQuestion" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "RoadmapQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadmapOption" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "RoadmapOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurriculumSubject_teacherId_idx" ON "CurriculumSubject"("teacherId");

-- CreateIndex
CREATE INDEX "CurriculumChapter_subjectId_idx" ON "CurriculumChapter"("subjectId");

-- CreateIndex
CREATE INDEX "RoadmapNode_chapterId_idx" ON "RoadmapNode"("chapterId");

-- CreateIndex
CREATE INDEX "RoadmapQuestion_nodeId_idx" ON "RoadmapQuestion"("nodeId");

-- CreateIndex
CREATE INDEX "RoadmapOption_questionId_idx" ON "RoadmapOption"("questionId");

-- AddForeignKey
ALTER TABLE "CurriculumSubject" ADD CONSTRAINT "CurriculumSubject_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumChapter" ADD CONSTRAINT "CurriculumChapter_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CurriculumSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapNode" ADD CONSTRAINT "RoadmapNode_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CurriculumChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapQuestion" ADD CONSTRAINT "RoadmapQuestion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "RoadmapNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapOption" ADD CONSTRAINT "RoadmapOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RoadmapQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
