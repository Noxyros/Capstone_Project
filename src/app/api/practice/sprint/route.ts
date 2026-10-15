import { NextResponse } from 'next/server'
import { RoadmapNodeType } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { getAppProfile, jakartaDateKey, recordReward } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

const SPRINT_QUESTION_COUNT = 10
const SPRINT_REWARD_XP = 30
type SprintAnswer = { questionId: string; optionIds: string[] }

function isSprintAnswer(value: unknown): value is SprintAnswer {
  return typeof value === 'object'
    && value !== null
    && 'questionId' in value && typeof value.questionId === 'string'
    && 'optionIds' in value && Array.isArray(value.optionIds)
    && value.optionIds.length > 0
    && value.optionIds.length <= 5
    && value.optionIds.every((id) => typeof id === 'string')
    && new Set(value.optionIds).size === value.optionIds.length
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!]
  }
  return result
}

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const pool = await prisma.question.findMany({
      where: {
        node: {
          type: { in: [RoadmapNodeType.QUIZ, RoadmapNodeType.BOSS] },
          isPublished: true,
          chapter: { isPublished: true },
          OR: [{ submoduleId: null }, { submodule: { isPublished: true } }],
        },
      },
      select: {
        id: true,
        prompt: true,
        options: { select: { id: true, text: true, isCorrect: true } },
      },
      take: 500,
    })

    const questions = shuffle(pool.filter((question) =>
      question.options.length >= 2
      && question.options.some((option) => option.isCorrect)
      && question.options.filter((option) => option.isCorrect).length <= 5
    )).slice(0, SPRINT_QUESTION_COUNT).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      allowsMultipleAnswers: question.options.filter((option) => option.isCorrect).length > 1,
      options: question.options.map(({ id, text }) => ({ id, text })),
    }))

    return NextResponse.json({ questions, questionCount: SPRINT_QUESTION_COUNT }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Failed to load rapid sprint questions.', error)
    return NextResponse.json({ error: 'Could not load Rapid Sprint questions.' }, { status: 500 })
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
  if (
    typeof body !== 'object'
    || body === null
    || !('answers' in body)
    || !Array.isArray(body.answers)
    || body.answers.length !== SPRINT_QUESTION_COUNT
    || !body.answers.every(isSprintAnswer)
  ) {
    return NextResponse.json({ error: 'Rapid Sprint answers are invalid.' }, { status: 400 })
  }

  const answers = body.answers
  if (new Set(answers.map((answer) => answer.questionId)).size !== SPRINT_QUESTION_COUNT) {
    return NextResponse.json({ error: 'Rapid Sprint must contain ten unique questions.' }, { status: 400 })
  }

  try {
    const questions = await prisma.question.findMany({
      where: {
        id: { in: answers.map((answer) => answer.questionId) },
        node: {
          type: { in: [RoadmapNodeType.QUIZ, RoadmapNodeType.BOSS] },
          isPublished: true,
          chapter: { isPublished: true },
          OR: [{ submoduleId: null }, { submodule: { isPublished: true } }],
        },
      },
      select: {
        id: true,
        options: { select: { id: true, isCorrect: true } },
      },
    })
    if (questions.length !== SPRINT_QUESTION_COUNT) {
      return NextResponse.json({ error: 'One or more Rapid Sprint questions are unavailable.' }, { status: 400 })
    }

    let correctCount = 0
    for (const answer of answers) {
      const question = questions.find((item) => item.id === answer.questionId)
      if (!question || answer.optionIds.some((id) => !question.options.some((option) => option.id === id))) {
        return NextResponse.json({ error: 'A selected answer does not belong to its question.' }, { status: 400 })
      }
      const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)
      if (
        answer.optionIds.length === correctOptionIds.length
        && answer.optionIds.every((id) => correctOptionIds.includes(id))
      ) {
        correctCount += 1
      }
    }

    const date = jakartaDateKey()
    const xpAwarded = await prisma.$transaction(async (transaction) => {
      const awarded = await recordReward(
        transaction,
        authentication.appUser.id,
        `practice:rapid-sprint:${date}`,
        SPRINT_REWARD_XP,
        0,
      )
      return awarded ? SPRINT_REWARD_XP : 0
    })
    const profile = await getAppProfile(authentication.appUser.id)
    if (!profile) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })

    return NextResponse.json({
      correctCount,
      questionCount: SPRINT_QUESTION_COUNT,
      xpAwarded,
      rewardAlreadyClaimed: xpAwarded === 0,
      profile,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to submit Rapid Sprint.', error)
    return NextResponse.json({ error: 'Could not submit Rapid Sprint.' }, { status: 500 })
  }
}
