import { NextResponse } from 'next/server'
import { Prisma, RoadmapContentType, RoadmapNodeType, Role } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'
import type { CurriculumSubject } from '@/src/lib/teacherContent'

const curriculumInclude = {
  grade: true,
  chapters: {
    include: {
      nodes: {
        include: {
          questions: {
            include: { options: true },
          },
          progress: { select: { userId: true, completedAt: true } },
        },
      },
    },
  },
}

function toCurriculumSubject(
  subject: Prisma.SubjectGetPayload<{ include: typeof curriculumInclude }>,
  teacherView: boolean,
  userId: string,
): CurriculumSubject {
  return {
    id: subject.id,
    name: subject.name,
    grade: subject.grade.level === 8 || subject.grade.level === 9 ? subject.grade.level : 7,
    icon: subject.icon ?? 'book',
    color: (['blue', 'green', 'rose', 'amber', 'purple', 'cyan'].includes(subject.color)
      ? subject.color
      : 'blue') as CurriculumSubject['color'],
    chapters: subject.chapters.map((chapter) => {
      const nodes = chapter.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        type: node.type === RoadmapNodeType.QUIZ ? 'quiz' as const : 'lesson' as const,
        status: teacherView
          ? node.isPublished ? 'current' as const : 'locked' as const
          : node.progress.some((progress) => progress.userId === userId && progress.completedAt !== null) ? 'completed' as const : 'current' as const,
        contentType: node.contentType === RoadmapContentType.POSTER
          ? 'poster' as const
          : node.contentType === RoadmapContentType.MATERIAL ? 'material' as const : 'text' as const,
        content: node.content,
        resourceUrl: node.resourceUrl,
        questions: node.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          allowsMultipleAnswers: question.options.filter((option) => option.isCorrect).length > 1,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            ...(teacherView ? { isCorrect: option.isCorrect } : {}),
          })),
        })),
      }))

      return {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        summary: chapter.summaryText,
        chaptersStatus: teacherView
          ? chapter.isPublished ? 'in_progress' as const : 'locked' as const
          : nodes.length > 0 && nodes.every((node) => node.status === 'completed') ? 'completed' as const : 'in_progress' as const,
        nodes,
      }
    }),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown, maximum: number, allowEmpty = true): value is string {
  return typeof value === 'string' && value.length <= maximum && (allowEmpty || Boolean(value.trim()))
}

function validateCurriculum(value: unknown): value is CurriculumSubject[] {
  if (!Array.isArray(value) || value.length > 50) return false
  return value.every((subject) => {
    if (
      !isRecord(subject)
      || !isString(subject.id, 200, false)
      || !isString(subject.name, 120, false)
      || ![7, 8, 9].includes(subject.grade as number)
      || !isString(subject.icon, 80)
      || !['blue', 'green', 'rose', 'amber', 'purple', 'cyan'].includes(subject.color as string)
      || !Array.isArray(subject.chapters)
      || subject.chapters.length > 100
    ) return false

    return subject.chapters.every((chapter) => {
      if (
        !isRecord(chapter)
        || !isString(chapter.id, 200, false)
        || !isString(chapter.title, 160, false)
        || !Number.isInteger(chapter.order)
        || (chapter.order as number) < 1
        || !isString(chapter.summary, 4_000)
        || !['completed', 'in_progress', 'locked'].includes(chapter.chaptersStatus as string)
        || !Array.isArray(chapter.nodes)
        || chapter.nodes.length > 200
      ) return false

      return chapter.nodes.every((node) => {
        if (
          !isRecord(node)
          || !isString(node.id, 200, false)
          || !isString(node.title, 160, false)
          || (node.type !== 'lesson' && node.type !== 'quiz')
          || !['current', 'completed', 'locked'].includes(node.status as string)
          || !['text', 'poster', 'material'].includes(node.contentType as string)
          || !isString(node.content, 20_000)
          || !isString(node.resourceUrl, 2_000)
          || !Array.isArray(node.questions)
          || node.questions.length > 50
        ) return false

        return node.type !== 'quiz' || (node.questions.length > 0 && node.questions.every((question) => {
          if (
            !isRecord(question)
            || !isString(question.id, 200, false)
            || !isString(question.prompt, 2_000, false)
            || !Array.isArray(question.options)
            || question.options.length < 4
            || question.options.length > 5
          ) return false
          return question.options.every((option) => isRecord(option)
            && isString(option.id, 200, false)
            && isString(option.text, 1_000, false)
            && typeof option.isCorrect === 'boolean')
            && question.options.some((option) => isRecord(option) && option.isCorrect === true)
        }))
      })
    })
  })
}

export async function GET(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const teacherView = new URL(request.url).searchParams.get('view') === 'teacher'
  if (teacherView && authentication.appUser.role !== Role.TEACHER && authentication.appUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 })
  }

  const subjectWhere: Prisma.SubjectWhereInput = teacherView
    ? authentication.appUser.role === Role.ADMIN ? {} : { createdById: authentication.appUser.id }
    : {
      grade: { level: { in: [7, 8, 9] } },
      chapters: { some: { isPublished: true, nodes: { some: { isPublished: true } } } },
    }
  try {
    const subjects = await prisma.subject.findMany({
      where: subjectWhere,
      orderBy: { name: 'asc' },
      include: {
        grade: true,
        chapters: {
          where: teacherView ? undefined : { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            nodes: {
              where: teacherView ? undefined : { isPublished: true },
              orderBy: { order: 'asc' },
              include: {
                questions: { include: { options: true } },
                progress: {
                  where: { userId: authentication.appUser.id },
                  select: { userId: true, completedAt: true },
                },
              },
            },
          },
        },
      },
    })
    const result = subjects
      .map((subject) => toCurriculumSubject(subject, teacherView, authentication.appUser.id))
      .filter((subject) => teacherView || subject.chapters.length > 0)
    return NextResponse.json({ subjects: result })
  } catch (error) {
    console.error('Failed to load curriculum from the database.', error)
    return NextResponse.json({ error: 'Could not load curriculum.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }
  if (authentication.appUser.role !== Role.TEACHER && authentication.appUser.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Teacher access is required.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (!isRecord(body) || !validateCurriculum(body.subjects)) {
    return NextResponse.json({ error: 'Curriculum data is invalid or exceeds supported limits.' }, { status: 400 })
  }

  const subjects = body.subjects
  const subjectIds = new Set(subjects.map((subject) => subject.id))
  if (subjectIds.size !== subjects.length) {
    return NextResponse.json({ error: 'Curriculum contains duplicate subject IDs.' }, { status: 400 })
  }
  const chapterIds = subjects.flatMap((subject) => subject.chapters.map((chapter) => chapter.id))
  const nodeIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.map((node) => node.id)))
  const questionIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.flatMap((node) => node.questions.map((question) => question.id))))
  const optionIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.flatMap((node) => node.questions.flatMap((question) => question.options.map((option) => option.id)))))
  if (
    new Set(chapterIds).size !== chapterIds.length
    || new Set(nodeIds).size !== nodeIds.length
    || new Set(questionIds).size !== questionIds.length
    || new Set(optionIds).size !== optionIds.length
  ) {
    return NextResponse.json({ error: 'Curriculum contains duplicate IDs.' }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const existingSubjects = await transaction.subject.findMany({
        where: { id: { in: [...subjectIds] } },
        select: { id: true, createdById: true },
      })
      if (existingSubjects.some((subject) => authentication.appUser.role !== Role.ADMIN && subject.createdById !== authentication.appUser.id)) {
        throw new Error('CURRICULUM_OWNERSHIP_CONFLICT')
      }
      const existingChapters = chapterIds.length
        ? await transaction.chapter.findMany({ where: { id: { in: chapterIds } }, select: { id: true, subjectId: true } })
        : []
      const requestedChapterOwners = new Map(subjects.flatMap((subject) => subject.chapters.map((chapter) => [chapter.id, subject.id] as const)))
      if (existingChapters.some((chapter) => requestedChapterOwners.get(chapter.id) !== chapter.subjectId)) {
        throw new Error('CURRICULUM_OWNERSHIP_CONFLICT')
      }
      const existingNodes = nodeIds.length
        ? await transaction.roadmapNode.findMany({ where: { id: { in: nodeIds } }, select: { id: true, chapterId: true } })
        : []
      const requestedNodeOwners = new Map(subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.map((node) => [node.id, chapter.id] as const))))
      if (existingNodes.some((node) => requestedNodeOwners.get(node.id) !== node.chapterId)) {
        throw new Error('CURRICULUM_OWNERSHIP_CONFLICT')
      }

      const ownedSubjectWhere: Prisma.SubjectWhereInput = authentication.appUser.role === Role.ADMIN
        ? {}
        : { createdById: authentication.appUser.id }
      const existingOwned = await transaction.subject.findMany({
        where: ownedSubjectWhere,
        select: { id: true },
      })
      const removedIds = existingOwned.map((subject) => subject.id).filter((id) => !subjectIds.has(id))
      if (removedIds.length) {
        await transaction.subject.deleteMany({ where: { id: { in: removedIds }, ...ownedSubjectWhere } })
      }

      for (const subject of subjects) {
        const grade = await transaction.grade.findFirst({ where: { level: subject.grade } })
          ?? await transaction.grade.create({ data: { name: `Kelas ${subject.grade}`, level: subject.grade } })

        const existing = existingSubjects.find((item) => item.id === subject.id)
        const subjectData = {
          name: subject.name.trim(),
          icon: subject.icon || null,
          color: subject.color,
          gradeId: grade.id,
        }
        if (existing) {
          await transaction.subject.update({ where: { id: subject.id }, data: subjectData })
        } else {
          await transaction.subject.create({
            data: { id: subject.id, ...subjectData, createdById: authentication.appUser.id },
          })
        }

        const chapterIds = new Set(subject.chapters.map((chapter) => chapter.id))
        const existingChapters = await transaction.chapter.findMany({
          where: { subjectId: subject.id },
          select: { id: true },
        })
        const removedChapterIds = existingChapters.map((chapter) => chapter.id).filter((id) => !chapterIds.has(id))
        if (removedChapterIds.length) {
          await transaction.chapter.deleteMany({ where: { id: { in: removedChapterIds }, subjectId: subject.id } })
        }

        for (const chapter of subject.chapters) {
          await transaction.chapter.upsert({
            where: { id: chapter.id },
            create: {
              id: chapter.id,
              title: chapter.title.trim(),
              order: chapter.order,
              summaryText: chapter.summary,
              isPublished: chapter.chaptersStatus !== 'locked',
              subjectId: subject.id,
            },
            update: {
              title: chapter.title.trim(),
              order: chapter.order,
              summaryText: chapter.summary,
              isPublished: chapter.chaptersStatus !== 'locked',
            },
          })

          const nodeIds = new Set(chapter.nodes.map((node) => node.id))
          const existingNodes = await transaction.roadmapNode.findMany({
            where: { chapterId: chapter.id },
            select: { id: true },
          })
          const removedNodeIds = existingNodes.map((node) => node.id).filter((id) => !nodeIds.has(id))
          if (removedNodeIds.length) {
            await transaction.roadmapNode.deleteMany({ where: { id: { in: removedNodeIds }, chapterId: chapter.id } })
          }

          for (const [index, node] of chapter.nodes.entries()) {
            const nodeData = {
              title: node.title.trim(),
              order: index + 1,
              type: node.type === 'quiz' ? RoadmapNodeType.QUIZ : RoadmapNodeType.LESSON,
              contentType: node.contentType === 'poster'
                ? RoadmapContentType.POSTER
                : node.contentType === 'material' ? RoadmapContentType.MATERIAL : RoadmapContentType.TEXT,
              content: node.content,
              resourceUrl: node.resourceUrl,
              isPublished: node.status !== 'locked',
              chapterId: chapter.id,
            }
            await transaction.roadmapNode.upsert({
              where: { id: node.id },
              create: { id: node.id, ...nodeData },
              update: nodeData,
            })
            await transaction.question.deleteMany({ where: { nodeId: node.id } })
            if (node.type === 'quiz') {
              for (const question of node.questions) {
                await transaction.question.create({
                  data: {
                    id: question.id,
                    prompt: question.prompt.trim(),
                    nodeId: node.id,
                    options: {
                      create: question.options.map((option) => ({
                        id: option.id,
                        text: option.text.trim(),
                        isCorrect: option.isCorrect,
                      })),
                    },
                  },
                })
              }
            }
          }
        }
      }
    })
    return NextResponse.json({ saved: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'CURRICULUM_OWNERSHIP_CONFLICT') {
      return NextResponse.json({ error: 'You can only edit curriculum that belongs to your account.' }, { status: 403 })
    }
    console.error('Failed to save curriculum to the database.', error)
    return NextResponse.json({ error: 'Could not save curriculum. No changes were committed.' }, { status: 500 })
  }
}
