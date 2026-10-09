import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { getAppProfile } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

type AnswerRequest = {
  attemptId: string
  questionId: string
  optionIds: string[]
}

function isAnswerRequest(value: unknown): value is AnswerRequest {
  return typeof value === 'object'
    && value !== null
    && 'attemptId' in value && typeof value.attemptId === 'string'
    && 'questionId' in value && typeof value.questionId === 'string'
    && 'optionIds' in value && Array.isArray(value.optionIds)
    && value.optionIds.length >= 1
    && value.optionIds.length <= 5
    && value.optionIds.every((optionId) => typeof optionId === 'string')
    && new Set(value.optionIds).size === value.optionIds.length
}

class AnswerError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
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
  if (!isAnswerRequest(body)) {
    return NextResponse.json({ error: 'Answer data is invalid.' }, { status: 400 })
  }
  const { attemptId, questionId, optionIds: selectedIds } = body

  try {
    const answerResult = await prisma.$transaction(async (transaction) => {
      const attempt = await transaction.quizAttempt.findFirst({
        where: { id: attemptId, userId: authentication.appUser.id },
        select: { id: true, nodeId: true, completedAt: true },
      })
      if (!attempt) throw new AnswerError('This quiz attempt is unavailable.', 404)
      if (attempt.completedAt) throw new AnswerError('This quiz attempt is already complete.', 409)

      const existingAnswer = await transaction.quizAnswer.findUnique({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId } },
        select: { isCorrect: true, heartLost: true },
      })
      if (existingAnswer) {
        const correctOptions = await transaction.option.findMany({
          where: { questionId: body.questionId, isCorrect: true },
          select: { id: true },
        })
        const user = await transaction.user.findUniqueOrThrow({
          where: { id: authentication.appUser.id },
          select: { hearts: true, maxHearts: true, superMode: true },
        })
        return {
          isCorrect: existingAnswer.isCorrect,
          heartLost: existingAnswer.heartLost,
          correctOptionIds: correctOptions.map((option) => option.id),
          user,
        }
      }

      const [question, user] = await Promise.all([
        transaction.question.findFirst({
          where: { id: questionId, nodeId: attempt.nodeId },
          select: {
            id: true,
            options: { select: { id: true, isCorrect: true } },
          },
        }),
        transaction.user.findUnique({
          where: { id: authentication.appUser.id },
          select: { hearts: true, maxHearts: true, superMode: true },
        }),
      ])
      if (!question) throw new AnswerError('This quiz question is unavailable.', 404)
      if (!user) throw new AnswerError('Your learner account could not be found.', 404)
      if (user.hearts <= 0 && !user.superMode) {
        throw new AnswerError('You are out of hearts. Refill your hearts or activate Super Mode to continue.', 409)
      }

      if (selectedIds.some((id) => !question.options.some((option) => option.id === id))) {
        throw new AnswerError('Selected answers do not belong to this question.', 400)
      }
      const correctOptionIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)
      const isCorrect = selectedIds.length === correctOptionIds.length
        && selectedIds.every((id) => correctOptionIds.includes(id))
      const heartLost = !isCorrect && !user.superMode

      const inserted = await transaction.quizAnswer.createMany({
        data: [{
          id: crypto.randomUUID(),
          userId: authentication.appUser.id,
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionIds: selectedIds,
          isCorrect,
          heartLost,
        }],
        skipDuplicates: true,
      })
      if (inserted.count === 0) {
        const saved = await transaction.quizAnswer.findUniqueOrThrow({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
          select: { isCorrect: true, heartLost: true },
        })
        return { isCorrect: saved.isCorrect, heartLost: saved.heartLost, correctOptionIds, user }
      }

      if (heartLost) {
        const updated = await transaction.user.updateMany({
          where: { id: authentication.appUser.id, hearts: { gt: 0 }, superMode: false },
          data: { hearts: { decrement: 1 } },
        })
        if (updated.count !== 1) throw new AnswerError('Your heart balance changed. Turn on Super Mode or refill hearts to continue.', 409)
        user.hearts -= 1
      }

      return { isCorrect, heartLost, correctOptionIds, user }
    }, { isolationLevel: 'Serializable' })

    const profile = await getAppProfile(authentication.appUser.id)
    if (!profile) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })
    return NextResponse.json({
      isCorrect: answerResult.isCorrect,
      heartLost: answerResult.heartLost,
      correctOptionIds: answerResult.correctOptionIds,
      hearts: answerResult.user.hearts,
      maxHearts: answerResult.user.maxHearts,
      superMode: answerResult.user.superMode,
      profile,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AnswerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to validate quiz answer.', error)
    return NextResponse.json({ error: 'Could not check this answer. Please try again.' }, { status: 500 })
  }
}
