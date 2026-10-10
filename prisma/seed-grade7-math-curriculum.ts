import {
  PrismaClient,
  RoadmapContentType,
  RoadmapNodeType,
  RoadmapRewardCurrency,
  Role,
} from '@prisma/client'
import { randomInt } from 'node:crypto'
import { buildGrade7MathDomains } from './grade7MathCurriculum'

const prisma = new PrismaClient()
const subjectId = 'g7-math-integers-pilot'
const domains = buildGrade7MathDomains(randomInt)

async function main() {
  const existingSubject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      createdById: true,
      chapters: {
        select: {
          id: true,
          submodules: { orderBy: { order: 'asc' }, select: { id: true, order: true } },
          nodes: {
            select: {
              id: true,
              order: true,
              submoduleId: true,
              rewardCurrency: true,
              rewardAmount: true,
              progress: { select: { id: true } },
              quizAttempts: { select: { id: true } },
            },
          },
        },
      },
    },
  })
  const teacher = existingSubject?.createdById
    ? await prisma.user.findFirst({
      where: { id: existingSubject.createdById, role: Role.TEACHER },
      select: { id: true },
    })
    : await prisma.user.findFirst({
      where: { role: Role.TEACHER },
      select: { id: true },
    })
  if (!teacher) {
    throw new Error('A teacher account is required to own the Grade 7 Mathematics curriculum. No data was changed.')
  }
  if (existingSubject && existingSubject.createdById !== teacher.id) {
    throw new Error('The existing Mathematics subject belongs to a different account. No data was changed.')
  }

  const grade = await prisma.grade.findFirst({ where: { level: 7 }, select: { id: true } })
    ?? await prisma.grade.create({ data: { name: 'Kelas 7', level: 7 }, select: { id: true } })
  const subjectData = {
    name: 'Mathematics',
    icon: 'calculator',
    color: 'blue',
    gradeId: grade.id,
    createdById: teacher.id,
  }
  if (existingSubject) {
    await prisma.subject.update({ where: { id: subjectId }, data: subjectData })
  } else {
    await prisma.subject.create({ data: { id: subjectId, ...subjectData } })
  }

  for (const [chapterIndex, domain] of domains.entries()) {
    const priorChapter = existingSubject?.chapters.find((chapter) => chapter.id === domain.id)
    const priorNodes = priorChapter?.nodes ?? []
    const priorNodeMap = new Map(priorNodes.map((node) => [node.id, node]))
    const expectedNodeIds = new Set(domain.nodes.map((node) => node.id))
    const preservesExistingPath = priorNodes.length === domain.nodes.length
      && priorNodes.every((node) => expectedNodeIds.has(node.id))
    const orderedNodes = preservesExistingPath
      ? [...domain.nodes].sort((left, right) =>
        (priorNodeMap.get(left.id)?.order ?? 0) - (priorNodeMap.get(right.id)?.order ?? 0))
      : domain.nodes

    await prisma.$transaction(async (transaction) => {
      await transaction.chapter.upsert({
        where: { id: domain.id },
        create: {
          id: domain.id,
          title: domain.title,
          order: chapterIndex + 1,
          summaryText: domain.summary,
          isPublished: true,
          subjectId,
        },
        update: {
          title: domain.title,
          order: chapterIndex + 1,
          summaryText: domain.summary,
          isPublished: true,
        },
      })

      for (const submodule of domain.submodules) {
        await transaction.submodule.upsert({
          where: { id: submodule.id },
          create: {
            id: submodule.id,
            title: submodule.title,
            order: submodule.order,
            summaryText: submodule.summary,
            isPublished: true,
            chapterId: domain.id,
          },
          update: {
            title: submodule.title,
            order: submodule.order,
            summaryText: submodule.summary,
            isPublished: true,
          },
        })
      }

      const questionRows = orderedNodes.flatMap((node) =>
        priorNodeMap.get(node.id)?.quizAttempts.length
          ? []
          : node.questions.map((item) => ({
            id: item.id,
            prompt: item.prompt,
            nodeId: node.id,
            options: item.options.map((option) => ({
              id: option.id,
              text: option.text,
              isCorrect: option.isCorrect,
              questionId: item.id,
            })),
          })))
      const optionRows = questionRows.flatMap((item) => item.options)
      const replaceQuestionNodeIds = orderedNodes
        .filter((node) => !priorNodeMap.get(node.id)?.quizAttempts.length && node.questions.length > 0)
        .map((node) => node.id)

      for (const [nodeIndex, node] of orderedNodes.entries()) {
        const existingNode = priorNodeMap.get(node.id)
        const preserveTreasure = node.type === 'TREASURE' && existingNode?.rewardCurrency && existingNode.rewardAmount
        await transaction.roadmapNode.upsert({
          where: { id: node.id },
          create: {
            id: node.id,
            chapterId: domain.id,
            submoduleId: node.submoduleId,
            title: node.title,
            order: nodeIndex + 1,
            type: RoadmapNodeType[node.type],
            contentType: RoadmapContentType.TEXT,
            content: node.content,
            resourceUrl: '',
            isPublished: true,
            rewardCurrency: preserveTreasure
              ? existingNode.rewardCurrency
              : node.rewardCurrency === 'XP'
                ? RoadmapRewardCurrency.XP
                : node.rewardCurrency === 'GEMS' ? RoadmapRewardCurrency.GEMS : null,
            rewardAmount: preserveTreasure ? existingNode.rewardAmount : node.rewardAmount ?? null,
          },
          update: {
            submoduleId: node.submoduleId,
            title: node.title,
            order: nodeIndex + 1,
            type: RoadmapNodeType[node.type],
            contentType: RoadmapContentType.TEXT,
            content: node.content,
            resourceUrl: '',
            isPublished: true,
            rewardCurrency: preserveTreasure
              ? existingNode.rewardCurrency
              : node.rewardCurrency === 'XP'
                ? RoadmapRewardCurrency.XP
                : node.rewardCurrency === 'GEMS' ? RoadmapRewardCurrency.GEMS : null,
            rewardAmount: preserveTreasure ? existingNode.rewardAmount : node.rewardAmount ?? null,
          },
        })
      }

      if (replaceQuestionNodeIds.length) {
        await transaction.question.deleteMany({ where: { nodeId: { in: replaceQuestionNodeIds } } })
      }
      if (questionRows.length) {
        await transaction.question.createMany({
          data: questionRows.map((item) => ({
            id: item.id,
            prompt: item.prompt,
            nodeId: item.nodeId,
          })),
        })
        await transaction.option.createMany({ data: optionRows })
      }

      const expectedSubmoduleIds = domain.submodules.map((submodule) => submodule.id)
      const removedSubmoduleIds = (priorChapter?.submodules ?? [])
        .map((submodule) => submodule.id)
        .filter((id) => !expectedSubmoduleIds.includes(id))
      if (removedSubmoduleIds.length) {
        await transaction.submodule.deleteMany({
          where: { id: { in: removedSubmoduleIds }, chapterId: domain.id },
        })
      }
    }, { timeout: 120_000 })
  }

  const saved = await prisma.subject.findUniqueOrThrow({
    where: { id: subjectId },
    select: {
      name: true,
      chapters: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          submodules: { select: { id: true } },
          nodes: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              type: true,
              submoduleId: true,
              rewardCurrency: true,
              rewardAmount: true,
              questions: {
                select: {
                  options: { select: { isCorrect: true } },
                },
              },
            },
          },
        },
      },
    },
  })
  const validationErrors = saved.chapters.flatMap((chapter) => {
    const nodes = chapter.nodes
    const errors: string[] = []
    const submoduleIds = new Set(chapter.submodules.map((submodule) => submodule.id))
    const finalSubmoduleId = chapter.submodules.at(-1)?.id
    if (!nodes.length || nodes[0].type !== RoadmapNodeType.LESSON) {
      errors.push(`${chapter.title}: first node must be a lesson`)
    }
    if (nodes.at(-1)?.type !== RoadmapNodeType.BOSS) {
      errors.push(`${chapter.title}: final node must be an explicit boss`)
    }
    if (nodes.filter((node) => node.type === RoadmapNodeType.TREASURE).length !== 1) {
      errors.push(`${chapter.title}: expected exactly one treasure`)
    }
    for (const node of nodes) {
      if (!node.submoduleId || !submoduleIds.has(node.submoduleId)) {
        errors.push(`${chapter.title}: ${node.title} must belong to a submodule`)
      }
      if (node.type === RoadmapNodeType.BOSS && node.submoduleId !== finalSubmoduleId) {
        errors.push(`${chapter.title}: the domain boss must be in the final submodule`)
      }
      if (node.type === RoadmapNodeType.TREASURE
        && (!node.rewardCurrency || !node.rewardAmount || node.rewardAmount < 10)) {
        errors.push(`${chapter.title}: treasure reward must be configured and at least 10`)
      }
      if ((node.type === RoadmapNodeType.QUIZ || node.type === RoadmapNodeType.BOSS)
        && (!node.questions.length || node.questions.some((item) =>
          item.options.filter((option) => option.isCorrect).length !== 1))) {
        errors.push(`${chapter.title}: every quiz and boss question needs exactly one correct answer`)
      }
    }
    return errors
  })
  if (saved.chapters.length !== 4 || validationErrors.length) {
    throw new Error(`Curriculum verification failed: ${validationErrors.join('; ') || 'expected four domain chapters'}`)
  }

  console.log(JSON.stringify({
    subject: saved.name,
    chapters: saved.chapters.map((chapter) => ({
      title: chapter.title,
      nodeCount: chapter.nodes.length,
      lessonCount: chapter.nodes.filter((node) => node.type === RoadmapNodeType.LESSON).length,
      quizCount: chapter.nodes.filter((node) => node.type === RoadmapNodeType.QUIZ).length,
      treasure: chapter.nodes.filter((node) => node.type === RoadmapNodeType.TREASURE)
        .map((node) => ({ currency: node.rewardCurrency, amount: node.rewardAmount, order: chapter.nodes.indexOf(node) + 1 })),
      boss: chapter.nodes.at(-1)?.title,
      bossQuestions: chapter.nodes.at(-1)?.questions.length,
    })),
  }, null, 2))
}

main()
  .catch((error) => {
    console.error('Could not create the Grade 7 Mathematics curriculum.', error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
