import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

type MistakeAnswerRequest = {
  questionId: string
  optionIds: string[]
}

function isMistakeAnswerRequest(value: unknown): value is MistakeAnswerRequest {
  return typeof value === 'object'
    && value !== null
    && 'questionId' in value && typeof value.questionId === 'string' && value.questionId.length > 0
    && 'optionIds' in value && Array.isArray(value.optionIds)
    && value.optionIds.length > 0
    && value.optionIds.length <= 5
    && value.optionIds.every((id) => typeof id === 'string')
    && new Set(value.optionIds).size === value.optionIds.length
}

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const answers = await prisma.quizAnswer.findMany({
      where: {
        userId: authentication.appUser.id,
        isCorrect: false,
        question: {
          node: {
            isPublished: true,
            chapter: { isPublished: true },
            OR: [{ submoduleId: null }, { submodule: { isPublished: true } }],
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        createdAt: true,
        question: {
          select: {
            id: true,
            prompt: true,
            options: { select: { id: true, text: true, isCorrect: true } },
            node: {
              select: {
                id: true,
                title: true,
                chapterId: true,
                chapter: { select: { title: true } },
                submodule: { select: { title: true } },
              },
            },
          },
        },
      },
    })

    const seenQuestionIds = new Set<string>()
    const mistakes = answers.flatMap(({ question }) => {
      if (seenQuestionIds.has(question.id)) return []
      seenQuestionIds.add(question.id)
      return [{
        questionId: question.id,
        prompt: question.prompt,
        options: question.options.map(({ id, text }) => ({ id, text })),
        allowsMultipleAnswers: question.options.filter((option) => option.isCorrect).length > 1,
        chapterId: question.node.chapterId,
        chapterTitle: question.node.chapter.title,
        nodeId: question.node.id,
        nodeTitle: question.node.title,
        submoduleTitle: question.node.submodule?.title ?? null,
      }]
    })

    return NextResponse.json({ mistakes }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load learner mistakes.', error)
    return NextResponse.json({ error: 'Could not load your missed questions.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (!isMistakeAnswerRequest(body)) {
    return NextResponse.json({ error: 'Answer data is invalid.' }, { status: 400 })
  }

  try {
    const question = await prisma.question.findFirst({
      where: {
        id: body.questionId,
        node: {
          isPublished: true,
          chapter: { isPublished: true },
          OR: [{ submoduleId: null }, { submodule: { isPublished: true } }],
        },
      },
      select: { options: { select: { id: true, isCorrect: true } } },
    })
    if (!question) return NextResponse.json({ error: 'This question is unavailable.' }, { status: 404 })
    if (body.optionIds.some((id) => !question.options.some((option) => option.id === id))) {
      return NextResponse.json({ error: 'Selected answers do not belong to this question.' }, { status: 400 })
    }

    const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)
    const isCorrect = body.optionIds.length === correctOptionIds.length
      && body.optionIds.every((id) => correctOptionIds.includes(id))

    return NextResponse.json({ isCorrect, correctOptionIds }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to check a practice answer.', error)
    return NextResponse.json({ error: 'Could not check your answer.' }, { status: 500 })
  }
}
