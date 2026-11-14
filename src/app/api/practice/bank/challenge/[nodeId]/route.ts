import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { getAppProfile, recordReward, jakartaDateKey } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

const BANK_QUESTION_COUNT = 10
const BANK_SECONDS_PER_QUESTION = 90
const BANK_REWARD_XP = 30
const BANK_REWARD_GEMS = 20
const BANK_ATTEMPT_GRACE_SECONDS = 300

type BankAnswer = { questionId: string; optionIds: string[] }

function isBankAnswer(value: unknown): value is BankAnswer {
  return typeof value === 'object'
    && value !== null
    && 'questionId' in value && typeof value.questionId === 'string'
    && 'optionIds' in value && Array.isArray(value.optionIds)
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  // The frontend passes the submodule ID as the URL parameter.
  const { nodeId: submoduleId } = await params

  try {
    const submodule = await prisma.submodule.findFirst({
      where: {
        id: submoduleId,
        isPublished: true,
        chapter: { isPublished: true, subject: { isPublished: true } },
      },
      include: {
        chapter: { select: { id: true, title: true } },
      },
    })

    if (!submodule) {
      return NextResponse.json({ error: 'Submodule not found.' }, { status: 404 })
    }

    // Gather every published node inside this submodule.
    const nodes = await prisma.roadmapNode.findMany({
      where: {
        submoduleId,
        isPublished: true,
        chapter: { isPublished: true, subject: { isPublished: true } },
      },
      include: {
        questions: {
          select: {
            id: true,
            prompt: true,
            imageUrl: true,
            imageAlt: true,
            options: { select: { id: true, text: true, isCorrect: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    // Aggregate all valid questions across all nodes in the submodule.
    const allValidQuestions = nodes.flatMap((node) =>
      node.questions.filter((question) =>
        question.options.length >= 2
        && question.options.some((option) => option.isCorrect)
        && question.options.filter((option) => option.isCorrect).length <= 5,
      ),
    )

    if (allValidQuestions.length === 0) {
      return NextResponse.json({ error: 'No valid questions available for this submodule.' }, { status: 404 })
    }

    const now = new Date()
    await prisma.practiceBankAttempt.deleteMany({
      where: {
        userId: authentication.appUser.id,
        submoduleId,
        OR: [{ expiresAt: { lte: now } }, { completedAt: { not: null } }],
      },
    })
    const activeAttempt = await prisma.practiceBankAttempt.findFirst({
      where: {
        userId: authentication.appUser.id,
        submoduleId,
        completedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })
    const questionsById = new Map<string, (typeof allValidQuestions)[number]>()
    for (const question of allValidQuestions) questionsById.set(question.id, question)
    const resumedQuestions = activeAttempt?.questionIds.map((id) => questionsById.get(id))
    const canResumeAttempt = Boolean(
      activeAttempt
      && resumedQuestions?.length
      && resumedQuestions.length <= BANK_QUESTION_COUNT
      && resumedQuestions.every((question) => question !== undefined),
    )
    const selectedQuestions = canResumeAttempt && resumedQuestions
      ? resumedQuestions.filter(
        (question): question is (typeof allValidQuestions)[number] => question !== undefined,
      )
      : shuffle(allValidQuestions).slice(0, BANK_QUESTION_COUNT)

    let attemptId: string
    if (canResumeAttempt && activeAttempt) {
      attemptId = activeAttempt.id
    } else {
      if (activeAttempt) {
        await prisma.practiceBankAttempt.update({
          where: { id: activeAttempt.id },
          data: { completedAt: now },
        })
      }
      const attempt = await prisma.practiceBankAttempt.create({
        data: {
          userId: authentication.appUser.id,
          submoduleId,
          questionIds: selectedQuestions.map((question) => question.id),
          expiresAt: new Date(
            now.getTime()
            + (selectedQuestions.length * BANK_SECONDS_PER_QUESTION + BANK_ATTEMPT_GRACE_SECONDS) * 1000,
          ),
        },
        select: { id: true },
      })
      attemptId = attempt.id
    }

    const questions = selectedQuestions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      imageUrl: question.imageUrl,
      imageAlt: question.imageAlt,
      allowsMultipleAnswers: question.options.filter((option) => option.isCorrect).length > 1,
      options: question.options.map(({ id, text }) => ({ id, text })),
    }))

    return NextResponse.json({
      attemptId,
      questions,
      questionCount: questions.length,
      questionPoolSize: allValidQuestions.length,
      node: {
        id: submodule.id,
        title: submodule.title,
        chapter: submodule.chapter,
        submodule: { id: submodule.id, title: submodule.title },
      },
      timerSeconds: questions.length * BANK_SECONDS_PER_QUESTION,
      xpReward: BANK_REWARD_XP,
      gemsReward: BANK_REWARD_GEMS,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load bank challenge questions.', error)
    return NextResponse.json({ error: 'Could not load challenge questions.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { nodeId: submoduleId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (
    typeof body !== 'object'
    || body === null
    || !('attemptId' in body)
    || typeof body.attemptId !== 'string'
    || !('answers' in body)
    || !Array.isArray(body.answers)
    || body.answers.length === 0
    || !body.answers.every(isBankAnswer)
  ) {
    return NextResponse.json({ error: 'Bank challenge answers are invalid.' }, { status: 400 })
  }

  const answers = body.answers
  const attemptId = body.attemptId

  try {
    const attempt = await prisma.practiceBankAttempt.findFirst({
      where: {
        id: attemptId,
        userId: authentication.appUser.id,
        submoduleId,
      },
    })
    const now = new Date()
    if (!attempt || attempt.completedAt || attempt.expiresAt <= now) {
      return NextResponse.json({ error: 'This challenge attempt has expired or was already submitted.' }, { status: 409 })
    }

    const expectedQuestionIds = new Set(attempt.questionIds)
    if (
      answers.length !== expectedQuestionIds.size
      || answers.some((answer) => !expectedQuestionIds.has(answer.questionId))
    ) {
      return NextResponse.json({ error: 'Submitted questions do not match this challenge attempt.' }, { status: 400 })
    }

    const questions = await prisma.question.findMany({
      where: {
        id: { in: answers.map((answer) => answer.questionId) },
        node: {
          submoduleId,
          isPublished: true,
          submodule: {
            isPublished: true,
            chapter: { isPublished: true, subject: { isPublished: true } },
          },
          chapter: { isPublished: true, subject: { isPublished: true } },
        },
      },
      select: {
        id: true,
        options: { select: { id: true, isCorrect: true } },
      },
    })

    if (questions.length !== answers.length) {
      return NextResponse.json({ error: 'One or more questions are unavailable.' }, { status: 400 })
    }

    let correctCount = 0
    const questionResults: { questionId: string; isCorrect: boolean; correctOptionIds: string[] }[] = []
    const allAnswered = answers.every((answer) => answer.optionIds.length > 0)

    for (const answer of answers) {
      const question = questions.find((item) => item.id === answer.questionId)
      if (!question || answer.optionIds.some((id) => !question.options.some((option) => option.id === id))) {
        return NextResponse.json({ error: 'A selected answer does not belong to its question.' }, { status: 400 })
      }
      const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)
      const isCorrect =
        answer.optionIds.length === correctOptionIds.length
        && answer.optionIds.every((id) => correctOptionIds.includes(id))

      questionResults.push({
        questionId: answer.questionId,
        isCorrect,
        correctOptionIds: answer.optionIds.length > 0 ? correctOptionIds : [],
      })

      if (isCorrect) correctCount += 1
    }

    const { accepted, xpAwarded } = await prisma.$transaction(async (transaction) => {
      const completed = await transaction.practiceBankAttempt.updateMany({
        where: {
          id: attempt.id,
          userId: authentication.appUser.id,
          submoduleId,
          completedAt: null,
          expiresAt: { gt: now },
        },
        data: { completedAt: now },
      })
      if (completed.count !== 1) return { accepted: false, xpAwarded: 0 }

      if (!allAnswered) return { accepted: true, xpAwarded: 0 }

      const awarded = await recordReward(
        transaction,
        authentication.appUser.id,
        `practice:bank:${jakartaDateKey(now)}:${submoduleId}`,
        BANK_REWARD_XP,
        BANK_REWARD_GEMS,
      )
      return { accepted: true, xpAwarded: awarded ? BANK_REWARD_XP : 0 }
    })
    if (!accepted) {
      return NextResponse.json({ error: 'This challenge attempt has expired or was already submitted.' }, { status: 409 })
    }
    const gemsAwarded = xpAwarded > 0 ? BANK_REWARD_GEMS : 0

    const profile = await getAppProfile(authentication.appUser.id)
    if (!profile) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })

    return NextResponse.json({
      correctCount,
      questionCount: answers.length,
      xpAwarded,
      gemsAwarded,
      rewardAlreadyClaimed: allAnswered && xpAwarded === 0,
      questionResults,
      profile,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to submit bank challenge.', error)
    return NextResponse.json({ error: 'Could not submit challenge answers.' }, { status: 500 })
  }
}
