import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

const MAX_TRANSACTION_ATTEMPTS = 3

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

async function measureDatabaseOperation<T>(
  timings: Record<string, number>,
  name: string,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now()
  try {
    return await operation()
  } finally {
    timings[name] = (timings[name] ?? 0) + Math.round(performance.now() - startedAt)
  }
}

type AnswerStateRow = {
  attemptId: string
  completedAt: Date | null
  hearts: number
  maxHearts: number
  superMode: boolean
  questionId: string | null
  options: Prisma.JsonValue
  savedIsCorrect: boolean | null
  savedHeartLost: boolean | null
}

type AnswerOption = { id: string; isCorrect: boolean }

function isAnswerOptions(value: Prisma.JsonValue): value is AnswerOption[] {
  return Array.isArray(value) && value.every((option) =>
    typeof option === 'object'
    && option !== null
    && !Array.isArray(option)
    && 'id' in option
    && typeof option.id === 'string'
    && 'isCorrect' in option
    && typeof option.isCorrect === 'boolean')
}

async function withTransactionConflictRetry<T>(
  operation: () => Promise<T>,
): Promise<{ result: T; attempts: number }> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return { result: await operation(), attempts: attempt }
    } catch (error) {
      const isWriteConflict = error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2034'
      if (!isWriteConflict || attempt >= MAX_TRANSACTION_ATTEMPTS) throw error

      console.warn(`Quiz answer transaction conflicted; retrying (${attempt}/${MAX_TRANSACTION_ATTEMPTS - 1}).`)
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt))
    }
  }
}

export async function POST(request: Request) {
  const requestStartedAt = performance.now()
  let tokenVerificationMs = 0
  let appUserLookupMs = 0
  const authentication = await authenticateAppUser((timings) => {
    tokenVerificationMs = timings.tokenVerificationMs
    appUserLookupMs = timings.appUserLookupMs
  })
  const authenticationMs = Math.round(performance.now() - requestStartedAt)
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

  let transactionMs = 0
  let transactionAttempts = 0
  const databaseOperationTimings: Record<string, number> = {}
  try {
    const transactionStartedAt = performance.now()
    const { result: answerResult, attempts } = await withTransactionConflictRetry(() => prisma.$transaction(async (transaction) => {
      const rows = await measureDatabaseOperation(databaseOperationTimings, 'attemptQuestionUserReadMs', () =>
        transaction.$queryRaw<AnswerStateRow[]>`
          SELECT
            attempt."id" AS "attemptId",
            attempt."completedAt",
            learner."hearts",
            learner."maxHearts",
            learner."superMode",
            question."id" AS "questionId",
            COALESCE(
              json_agg(json_build_object('id', option."id", 'isCorrect', option."isCorrect"))
                FILTER (WHERE option."id" IS NOT NULL),
              '[]'::json
            ) AS "options",
            saved_answer."isCorrect" AS "savedIsCorrect",
            saved_answer."heartLost" AS "savedHeartLost"
          FROM "QuizAttempt" AS attempt
          JOIN "User" AS learner ON learner."id" = attempt."userId"
          LEFT JOIN "Question" AS question
            ON question."id" = ${questionId}
            AND question."nodeId" = attempt."nodeId"
          LEFT JOIN "Option" AS option ON option."questionId" = question."id"
          LEFT JOIN LATERAL (
            SELECT answer."isCorrect", answer."heartLost"
            FROM "QuizAnswer" AS answer
            WHERE answer."attemptId" = attempt."id"
              AND answer."questionId" = question."id"
            LIMIT 1
          ) AS saved_answer ON TRUE
          WHERE attempt."id" = ${attemptId}
            AND attempt."userId" = ${authentication.appUser.id}
          GROUP BY
            attempt."id",
            attempt."completedAt",
            learner."hearts",
            learner."maxHearts",
            learner."superMode",
            question."id",
            saved_answer."isCorrect",
            saved_answer."heartLost"
        `,
      )
      const row = rows[0]
      if (!row) throw new AnswerError('This quiz attempt is unavailable.', 404)
      if (row.completedAt) throw new AnswerError('This quiz attempt is already complete.', 409)
      if (!row.questionId) throw new AnswerError('This quiz question is unavailable.', 404)
      const validQuestionId = row.questionId
      if (!isAnswerOptions(row.options)) throw new Error('The database returned invalid quiz options.')
      const user = { hearts: row.hearts, maxHearts: row.maxHearts, superMode: row.superMode }
      const options = row.options
      if (selectedIds.some((id) => !options.some((option) => option.id === id))) {
        throw new AnswerError('Selected answers do not belong to this question.', 400)
      }
      const correctOptionIds = options.filter((option) => option.isCorrect).map((option) => option.id)
      if (row.savedIsCorrect !== null && row.savedHeartLost !== null) {
        return {
          isCorrect: row.savedIsCorrect,
          heartLost: row.savedHeartLost,
          correctOptionIds,
          user,
        }
      }
      if (user.hearts <= 0 && !user.superMode) {
        throw new AnswerError('You are out of hearts. Refill your hearts or activate Super Mode to continue.', 409)
      }

      const isCorrect = selectedIds.length === correctOptionIds.length
        && selectedIds.every((id) => correctOptionIds.includes(id))
      const heartLost = !isCorrect && !user.superMode

      const inserted = await measureDatabaseOperation(databaseOperationTimings, 'answerInsertMs', () =>
        transaction.quizAnswer.createMany({
          data: [{
            id: crypto.randomUUID(),
            userId: authentication.appUser.id,
            attemptId,
            questionId: validQuestionId,
            selectedOptionIds: selectedIds,
            isCorrect,
            heartLost,
          }],
          skipDuplicates: true,
        }),
      )
      if (inserted.count === 0) {
        const saved = await transaction.quizAnswer.findUniqueOrThrow({
          where: { attemptId_questionId: { attemptId, questionId: validQuestionId } },
          select: { isCorrect: true, heartLost: true },
        })
        return { isCorrect: saved.isCorrect, heartLost: saved.heartLost, correctOptionIds, user }
      }

      if (heartLost) {
        const updated = await measureDatabaseOperation(databaseOperationTimings, 'heartUpdateMs', () =>
          transaction.user.updateMany({
            where: { id: authentication.appUser.id, hearts: { gt: 0 }, superMode: false },
            data: { hearts: { decrement: 1 } },
          }),
        )
        if (updated.count !== 1) throw new AnswerError('Your heart balance changed. Turn on Super Mode or refill hearts to continue.', 409)
        user.hearts -= 1
      }

      return { isCorrect, heartLost, correctOptionIds, user }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10_000,
      timeout: 30_000,
    }))
    transactionMs = Math.round(performance.now() - transactionStartedAt)
    transactionAttempts = attempts
    const totalMs = Math.round(performance.now() - requestStartedAt)
    console.info('Quiz answer request timing.', {
      authenticationMs,
      tokenVerificationMs,
      appUserLookupMs,
      transactionMs,
      transactionAttempts,
      databaseOperationTimings,
      totalMs,
    })

    return NextResponse.json({
      isCorrect: answerResult.isCorrect,
      correctOptionIds: answerResult.correctOptionIds,
      hearts: answerResult.user.hearts,
      maxHearts: answerResult.user.maxHearts,
      superMode: answerResult.user.superMode,
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Server-Timing': `token;dur=${tokenVerificationMs}, user-lookup;dur=${appUserLookupMs}, transaction;dur=${transactionMs}, total;dur=${totalMs}`,
      },
    })
  } catch (error) {
    if (error instanceof AnswerError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to validate quiz answer.', error)
    console.error('Quiz answer request timing.', {
      authenticationMs,
      tokenVerificationMs,
      appUserLookupMs,
      transactionMs,
      transactionAttempts,
      databaseOperationTimings,
      totalMs: Math.round(performance.now() - requestStartedAt),
    })
    return NextResponse.json({ error: 'Could not check this answer. Please try again.' }, { status: 500 })
  }
}
