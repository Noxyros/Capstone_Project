import { NextResponse } from 'next/server'
import { Prisma, RoadmapContentType, RoadmapNodeType, RoadmapRewardCurrency, Role } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'
import type { CurriculumSubject } from '@/src/lib/teacherContent'

function curriculumInclude(userId: string, teacherView: boolean) {
  return {
    grade: true,
    chapters: {
      where: teacherView ? undefined : { isPublished: true },
      orderBy: { order: 'asc' as const },
      include: {
        submodules: {
          where: teacherView ? undefined : { isPublished: true },
          orderBy: { order: 'asc' as const },
        },
        nodes: {
          where: teacherView ? undefined : {
            isPublished: true,
            OR: [{ submoduleId: null }, { submodule: { isPublished: true } }],
          },
          orderBy: { order: 'asc' as const },
          include: {
            questions: {
              include: { options: true },
            },
            progress: {
              where: { userId },
              select: { userId: true, completedAt: true },
            },
          },
        },
      },
    },
  } satisfies Prisma.SubjectInclude
}

type CurriculumSubjectRecord = Prisma.SubjectGetPayload<{ include: ReturnType<typeof curriculumInclude> }>

function toCurriculumSubject(
  subject: CurriculumSubjectRecord,
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
        submoduleId: node.submoduleId ?? chapter.submodules.at(-1)?.id ?? null,
        title: node.title,
        type: node.type === RoadmapNodeType.BOSS
          ? 'boss' as const
          : node.type === RoadmapNodeType.QUIZ
            ? 'quiz' as const
            : node.type === RoadmapNodeType.TREASURE ? 'treasure' as const : 'lesson' as const,
        status: teacherView
          ? node.isPublished ? 'current' as const : 'locked' as const
          : node.progress.some((progress) => progress.userId === userId && progress.completedAt !== null) ? 'completed' as const : 'current' as const,
        contentType: node.contentType === RoadmapContentType.POSTER
          ? 'poster' as const
          : node.contentType === RoadmapContentType.MATERIAL ? 'material' as const : 'text' as const,
        content: node.content,
        resourceUrl: node.resourceUrl,
        ...(node.rewardCurrency ? { rewardCurrency: node.rewardCurrency.toLowerCase() as 'xp' | 'gems' } : {}),
        ...(node.rewardAmount !== null ? { rewardAmount: node.rewardAmount } : {}),
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
        submodules: chapter.submodules.map((submodule) => ({
          id: submodule.id,
          title: submodule.title,
          order: submodule.order,
          summary: submodule.summaryText,
          isPublished: submodule.isPublished,
        })),
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

function validateCurriculum(value: unknown): { subjects: CurriculumSubject[] } | { error: string } {
  if (!Array.isArray(value)) return { error: 'subjects must be an array.' }
  if (value.length > 50) return { error: 'subjects exceeds the 50-item limit.' }

  for (const [subjectIndex, subject] of value.entries()) {
    const subjectPath = `subjects[${subjectIndex}]`
    if (!isRecord(subject)) return { error: `${subjectPath} must be an object.` }
    if (!isString(subject.id, 200, false)) return { error: `${subjectPath}.id must be a non-empty string (max 200 characters).` }
    if (!isString(subject.name, 120, false)) return { error: `${subjectPath}.name must be a non-empty string (max 120 characters).` }
    if (![7, 8, 9].includes(subject.grade as number)) return { error: `${subjectPath}.grade must be 7, 8, or 9.` }
    if (!isString(subject.icon, 80)) return { error: `${subjectPath}.icon must be a string (max 80 characters).` }
    if (!['blue', 'green', 'rose', 'amber', 'purple', 'cyan'].includes(subject.color as string)) {
      return { error: `${subjectPath}.color is not supported.` }
    }
    if (!Array.isArray(subject.chapters)) return { error: `${subjectPath}.chapters must be an array.` }
    if (subject.chapters.length > 100) return { error: `${subjectPath}.chapters exceeds the 100-item limit.` }

    for (const [chapterIndex, chapter] of subject.chapters.entries()) {
      const chapterPath = `${subjectPath}.chapters[${chapterIndex}]`
      if (!isRecord(chapter)) return { error: `${chapterPath} must be an object.` }
      if (!isString(chapter.id, 200, false)) return { error: `${chapterPath}.id must be a non-empty string (max 200 characters).` }
      if (!isString(chapter.title, 160, false)) return { error: `${chapterPath}.title must be a non-empty string (max 160 characters).` }
      if (!Number.isInteger(chapter.order) || (chapter.order as number) < 1) return { error: `${chapterPath}.order must be a positive integer.` }
      if (!isString(chapter.summary, 4_000)) return { error: `${chapterPath}.summary must be a string (max 4,000 characters).` }
      if (!['completed', 'in_progress', 'locked'].includes(chapter.chaptersStatus as string)) {
        return { error: `${chapterPath}.chaptersStatus is not supported.` }
      }
      if (!Array.isArray(chapter.submodules)) return { error: `${chapterPath}.submodules must be an array.` }
      if (chapter.submodules.length > 100) return { error: `${chapterPath}.submodules exceeds the 100-item limit.` }
      if (!Array.isArray(chapter.nodes)) return { error: `${chapterPath}.nodes must be an array.` }
      if (chapter.nodes.length > 200) return { error: `${chapterPath}.nodes exceeds the 200-item limit.` }

      const submoduleIds = new Set<string>()
      const submoduleOrders = new Set<number>()
      for (const [submoduleIndex, submodule] of chapter.submodules.entries()) {
        const submodulePath = `${chapterPath}.submodules[${submoduleIndex}]`
        if (!isRecord(submodule)) return { error: `${submodulePath} must be an object.` }
        if (!isString(submodule.id, 200, false)) return { error: `${submodulePath}.id must be a non-empty string (max 200 characters).` }
        if (!isString(submodule.title, 160, false)) return { error: `${submodulePath}.title must be a non-empty string (max 160 characters).` }
        if (!Number.isInteger(submodule.order) || (submodule.order as number) < 1) return { error: `${submodulePath}.order must be a positive integer.` }
        if (!isString(submodule.summary, 4_000)) return { error: `${submodulePath}.summary must be a string (max 4,000 characters).` }
        if (typeof submodule.isPublished !== 'boolean') return { error: `${submodulePath}.isPublished must be a boolean.` }
        if (submoduleIds.has(submodule.id)) return { error: `${submodulePath}.id must be unique within its chapter.` }
        if (submoduleOrders.has(submodule.order as number)) return { error: `${submodulePath}.order must be unique within its chapter.` }
        submoduleIds.add(submodule.id)
        submoduleOrders.add(submodule.order as number)
      }

      for (const [nodeIndex, node] of chapter.nodes.entries()) {
        const nodePath = `${chapterPath}.nodes[${nodeIndex}]`
        if (!isRecord(node)) return { error: `${nodePath} must be an object.` }
        if (!isString(node.id, 200, false)) return { error: `${nodePath}.id must be a non-empty string (max 200 characters).` }
        if (!isString(node.title, 160, node.type === 'treasure')) return { error: `${nodePath}.title is invalid (max 160 characters).` }
        if (node.type !== 'lesson' && node.type !== 'quiz' && node.type !== 'boss' && node.type !== 'treasure') {
          return { error: `${nodePath}.type is not supported.` }
        }
        if (!['current', 'completed', 'locked'].includes(node.status as string)) return { error: `${nodePath}.status is not supported.` }
        if (!['text', 'poster', 'material'].includes(node.contentType as string)) return { error: `${nodePath}.contentType is not supported.` }
        if (!isString(node.content, 20_000)) return { error: `${nodePath}.content must be a string (max 20,000 characters).` }
        if (!isString(node.resourceUrl, 2_000)) return { error: `${nodePath}.resourceUrl must be a string (max 2,000 characters).` }
        if ('submoduleId' in node
          && node.submoduleId !== null
          && (typeof node.submoduleId !== 'string' || !submoduleIds.has(node.submoduleId))) {
          return { error: `${nodePath}.submoduleId must refer to a submodule in this chapter.` }
        }
        if (!Array.isArray(node.questions)) return { error: `${nodePath}.questions must be an array.` }
        if (node.questions.length > 50) return { error: `${nodePath}.questions exceeds the 50-item limit.` }

        if (node.type === 'treasure') {
          if (node.questions.length !== 0) return { error: `${nodePath}.questions must be empty for a treasure node.` }
          if (node.rewardCurrency !== 'xp' && node.rewardCurrency !== 'gems') return { error: `${nodePath}.rewardCurrency is not supported.` }
          if (!Number.isInteger(node.rewardAmount) || (node.rewardAmount as number) < 10 || (node.rewardAmount as number) > 100_000) {
            return { error: `${nodePath}.rewardAmount must be an integer from 10 to 100,000.` }
          }
          continue
        }
        if ('rewardCurrency' in node || 'rewardAmount' in node) return { error: `${nodePath} cannot include treasure reward fields.` }
        if (node.type !== 'quiz' && node.type !== 'boss') continue
        if (node.questions.length === 0) return { error: `${nodePath}.questions must include at least one question.` }

        for (const [questionIndex, question] of node.questions.entries()) {
          const questionPath = `${nodePath}.questions[${questionIndex}]`
          if (!isRecord(question)) return { error: `${questionPath} must be an object.` }
          if (!isString(question.id, 200, false)) return { error: `${questionPath}.id must be a non-empty string (max 200 characters).` }
          if (!isString(question.prompt, 2_000, false)) return { error: `${questionPath}.prompt must be a non-empty string (max 2,000 characters).` }
          if (!Array.isArray(question.options)) return { error: `${questionPath}.options must be an array.` }
          if (question.options.length < 4 || question.options.length > 5) return { error: `${questionPath}.options must contain 4 or 5 options.` }
          for (const [optionIndex, option] of question.options.entries()) {
            const optionPath = `${questionPath}.options[${optionIndex}]`
            if (!isRecord(option)) return { error: `${optionPath} must be an object.` }
            if (!isString(option.id, 200, false)) return { error: `${optionPath}.id must be a non-empty string (max 200 characters).` }
            if (!isString(option.text, 1_000, false)) return { error: `${optionPath}.text must be a non-empty string (max 1,000 characters).` }
            if (typeof option.isCorrect !== 'boolean') return { error: `${optionPath}.isCorrect must be a boolean.` }
          }
          if (!question.options.some((option) => isRecord(option) && option.isCorrect === true)) {
            return { error: `${questionPath}.options must include at least one correct answer.` }
          }
        }
      }
    }
  }
  return { subjects: value as CurriculumSubject[] }
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
      include: curriculumInclude(authentication.appUser.id, teacherView),
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
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'Curriculum request must be an object.' }, { status: 400 })
  }
  const validation = validateCurriculum(body.subjects)
  if ('error' in validation) {
    return NextResponse.json({ error: `Curriculum data is invalid: ${validation.error}` }, { status: 400 })
  }

  const { subjects } = validation
  const subjectIds = new Set(subjects.map((subject) => subject.id))
  if (subjectIds.size !== subjects.length) {
    return NextResponse.json({ error: 'Curriculum contains duplicate subject IDs.' }, { status: 400 })
  }
  const chapterIds = subjects.flatMap((subject) => subject.chapters.map((chapter) => chapter.id))
  const submoduleIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.submodules.map((submodule) => submodule.id)))
  const nodeIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.map((node) => node.id)))
  const questionIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.flatMap((node) => node.questions.map((question) => question.id))))
  const optionIds = subjects.flatMap((subject) => subject.chapters.flatMap((chapter) => chapter.nodes.flatMap((node) => node.questions.flatMap((question) => question.options.map((option) => option.id)))))
  if (
    new Set(chapterIds).size !== chapterIds.length
    || new Set(submoduleIds).size !== submoduleIds.length
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
        include: {
          chapters: {
            include: {
              submodules: true,
              nodes: {
                include: {
                  questions: { include: { options: true } },
                },
              },
            },
          },
        },
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
      const existingSubmodules = submoduleIds.length
        ? await transaction.submodule.findMany({ where: { id: { in: submoduleIds } }, select: { id: true, chapterId: true } })
        : []
      const requestedSubmoduleOwners = new Map(subjects.flatMap((subject) =>
        subject.chapters.flatMap((chapter) => chapter.submodules.map((submodule) => [submodule.id, chapter.id] as const))))
      if (existingSubmodules.some((submodule) => requestedSubmoduleOwners.get(submodule.id) !== submodule.chapterId)) {
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
          if (
            existing.name !== subjectData.name
            || existing.icon !== subjectData.icon
            || existing.color !== subjectData.color
            || existing.gradeId !== subjectData.gradeId
          ) {
            await transaction.subject.update({ where: { id: subject.id }, data: subjectData })
          }
        } else {
          await transaction.subject.create({
            data: { id: subject.id, ...subjectData, createdById: authentication.appUser.id },
          })
        }

        const chapterIds = new Set(subject.chapters.map((chapter) => chapter.id))
        const removedChapterIds = (existing?.chapters ?? [])
          .map((chapter) => chapter.id)
          .filter((id) => !chapterIds.has(id))
        if (removedChapterIds.length) {
          await transaction.chapter.deleteMany({ where: { id: { in: removedChapterIds }, subjectId: subject.id } })
        }

        for (const chapter of subject.chapters) {
          const existingChapter = existing?.chapters.find((item) => item.id === chapter.id)
          const chapterData = {
            title: chapter.title.trim(),
            order: chapter.order,
            summaryText: chapter.summary,
            isPublished: chapter.chaptersStatus !== 'locked',
            subjectId: subject.id,
          }
          if (existingChapter) {
            if (
              existingChapter.title !== chapterData.title
              || existingChapter.order !== chapterData.order
              || existingChapter.summaryText !== chapterData.summaryText
              || existingChapter.isPublished !== chapterData.isPublished
            ) {
              await transaction.chapter.update({ where: { id: chapter.id }, data: chapterData })
            }
          } else {
            await transaction.chapter.create({
              data: {
                id: chapter.id,
                ...chapterData,
              },
            })
          }

          const requestedSubmoduleIds = new Set(chapter.submodules.map((submodule) => submodule.id))
          const existingChapterSubmodules = existingChapter?.submodules ?? []
          for (const submodule of chapter.submodules) {
            const existingSubmodule = existingChapterSubmodules.find((item) => item.id === submodule.id)
            const submoduleData = {
              title: submodule.title.trim(),
              order: submodule.order,
              summaryText: submodule.summary,
              isPublished: submodule.isPublished,
              chapterId: chapter.id,
            }
            if (existingSubmodule) {
              if (
                existingSubmodule.title !== submoduleData.title
                || existingSubmodule.order !== submoduleData.order
                || existingSubmodule.summaryText !== submoduleData.summaryText
                || existingSubmodule.isPublished !== submoduleData.isPublished
              ) {
                await transaction.submodule.update({ where: { id: submodule.id }, data: submoduleData })
              }
            } else {
              await transaction.submodule.create({
                data: {
                  id: submodule.id,
                  ...submoduleData,
                },
              })
            }
          }

          const nodeIds = new Set(chapter.nodes.map((node) => node.id))
          const existingChapterNodes = existingChapter?.nodes ?? []
          const removedNodeIds = existingChapterNodes.map((node) => node.id).filter((id) => !nodeIds.has(id))
          if (removedNodeIds.length) {
            await transaction.roadmapNode.deleteMany({ where: { id: { in: removedNodeIds }, chapterId: chapter.id } })
          }

          for (const [index, node] of chapter.nodes.entries()) {
            const existingNode = existingChapterNodes.find((item) => item.id === node.id)
            const nodeData = {
              title: node.title.trim(),
              order: index + 1,
              type: node.type === 'boss'
                ? RoadmapNodeType.BOSS
                : node.type === 'quiz'
                  ? RoadmapNodeType.QUIZ
                  : node.type === 'treasure' ? RoadmapNodeType.TREASURE : RoadmapNodeType.LESSON,
              contentType: node.contentType === 'poster'
                ? RoadmapContentType.POSTER
                : node.contentType === 'material' ? RoadmapContentType.MATERIAL : RoadmapContentType.TEXT,
              content: node.content,
              resourceUrl: node.resourceUrl,
              rewardCurrency: node.rewardCurrency === 'xp'
                ? RoadmapRewardCurrency.XP
                : node.rewardCurrency === 'gems' ? RoadmapRewardCurrency.GEMS : null,
              rewardAmount: node.rewardAmount ?? null,
              isPublished: node.status !== 'locked',
              chapterId: chapter.id,
              submoduleId: node.submoduleId ?? null,
            }
            if (existingNode) {
              if (
                existingNode.title !== nodeData.title
                || existingNode.order !== nodeData.order
                || existingNode.type !== nodeData.type
                || existingNode.contentType !== nodeData.contentType
                || existingNode.content !== nodeData.content
                || existingNode.resourceUrl !== nodeData.resourceUrl
                || existingNode.rewardCurrency !== nodeData.rewardCurrency
                || existingNode.rewardAmount !== nodeData.rewardAmount
                || existingNode.isPublished !== nodeData.isPublished
                || existingNode.submoduleId !== nodeData.submoduleId
              ) {
                await transaction.roadmapNode.update({ where: { id: node.id }, data: nodeData })
              }
            } else {
              await transaction.roadmapNode.create({ data: { id: node.id, ...nodeData } })
            }

            if (node.type !== 'quiz' && node.type !== 'boss') {
              if (existingNode?.questions.length) {
                await transaction.question.deleteMany({ where: { nodeId: node.id } })
              }
              continue
            }

            const existingQuestions = existingNode?.questions ?? []
            const requestedQuestionIds = new Set(node.questions.map((question) => question.id))
            const removedQuestionIds = existingQuestions
              .map((question) => question.id)
              .filter((id) => !requestedQuestionIds.has(id))
            if (removedQuestionIds.length) {
              await transaction.question.deleteMany({ where: { id: { in: removedQuestionIds }, nodeId: node.id } })
            }

            for (const question of node.questions) {
              const existingQuestion = existingQuestions.find((item) => item.id === question.id)
              if (!existingQuestion) {
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
                continue
              }

              const prompt = question.prompt.trim()
              if (existingQuestion.prompt !== prompt) {
                await transaction.question.update({ where: { id: question.id }, data: { prompt } })
              }

              const requestedOptionIds = new Set(question.options.map((option) => option.id))
              const removedOptionIds = existingQuestion.options
                .map((option) => option.id)
                .filter((id) => !requestedOptionIds.has(id))
              if (removedOptionIds.length) {
                await transaction.option.deleteMany({
                  where: { id: { in: removedOptionIds }, questionId: question.id },
                })
              }

              for (const option of question.options) {
                const existingOption = existingQuestion.options.find((item) => item.id === option.id)
                const optionData = { text: option.text.trim(), isCorrect: option.isCorrect }
                if (!existingOption) {
                  await transaction.option.create({
                    data: { id: option.id, questionId: question.id, ...optionData },
                  })
                } else if (
                  existingOption.text !== optionData.text
                  || existingOption.isCorrect !== optionData.isCorrect
                ) {
                  await transaction.option.update({ where: { id: option.id }, data: optionData })
                }
              }
            }
          }

          const removedSubmoduleIds = existingChapterSubmodules
            .map((submodule) => submodule.id)
            .filter((id) => !requestedSubmoduleIds.has(id))
          if (removedSubmoduleIds.length) {
            await transaction.submodule.deleteMany({
              where: { id: { in: removedSubmoduleIds }, chapterId: chapter.id },
            })
          }
        }
      }
    }, { maxWait: 10_000, timeout: 30_000 })
    return NextResponse.json({ saved: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'CURRICULUM_OWNERSHIP_CONFLICT') {
      return NextResponse.json({ error: 'You can only edit curriculum that belongs to your account.' }, { status: 403 })
    }
    console.error('Failed to save curriculum to the database.', error)
    return NextResponse.json({ error: 'Could not save curriculum. No changes were committed.' }, { status: 500 })
  }
}
