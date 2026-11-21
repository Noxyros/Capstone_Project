import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

type LegacyBankAttempt = {
  id: string
  completedAt: string | null
  correctCount: number
  xpAwarded: number
  gemsAwarded: number
  challenge: {
    attemptId?: string
    questions: {
      id: string
      prompt: string
      imageUrl?: string | null
      imageAlt?: string | null
      allowsMultipleAnswers: boolean
      options: { id: string; text: string }[]
    }[]
    questionCount: number
    questionPoolSize?: number
    node: {
      id: string
      title: string
      chapter: { id: string; title: string }
      submodule: { id: string; title: string } | null
    }
    timerSeconds: number
    xpReward: number
    gemsReward: number
  }
  questionResults: {
    questionId: string
    isCorrect: boolean
    correctOptionIds: string[]
    selectedOptionIds: string[]
  }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown, maxItems: number, maxLength: number): value is string[] {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => typeof item === 'string' && item.length > 0 && item.length <= maxLength)
}

function isLegacyBankAttempt(value: unknown, submoduleId: string): value is LegacyBankAttempt {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || value.id.length > 100
    || (value.id !== 'legacy' && !/^[a-z0-9]+-[a-z0-9]+$/i.test(value.id))
    || !(value.completedAt === null
      || (typeof value.completedAt === 'string' && !Number.isNaN(Date.parse(value.completedAt))))
    || !Number.isInteger(value.correctCount)
    || typeof value.correctCount !== 'number'
    || value.correctCount < 0
    || typeof value.xpAwarded !== 'number'
    || !Number.isFinite(value.xpAwarded)
    || typeof value.gemsAwarded !== 'number'
    || !Number.isFinite(value.gemsAwarded)
    || !isRecord(value.challenge)
    || !isRecord(value.challenge.node)
    || value.challenge.node.id !== submoduleId
    || typeof value.challenge.node.title !== 'string'
    || value.challenge.node.title.length > 500
    || !isRecord(value.challenge.node.chapter)
    || typeof value.challenge.node.chapter.id !== 'string'
    || typeof value.challenge.node.chapter.title !== 'string'
    || value.challenge.node.chapter.title.length > 500
    || (value.challenge.node.submodule !== null
      && (!isRecord(value.challenge.node.submodule)
        || value.challenge.node.submodule.id !== submoduleId
        || typeof value.challenge.node.submodule.title !== 'string'
        || value.challenge.node.submodule.title.length > 500))
    || !Array.isArray(value.challenge.questions)
    || value.challenge.questions.length < 1
    || value.challenge.questions.length > 10
    || value.challenge.questionCount !== value.challenge.questions.length
    || (value.challenge.questionPoolSize !== undefined
      && (!Number.isInteger(value.challenge.questionPoolSize)
        || typeof value.challenge.questionPoolSize !== 'number'
        || value.challenge.questionPoolSize < value.challenge.questionCount))
    || typeof value.challenge.timerSeconds !== 'number'
    || !Number.isFinite(value.challenge.timerSeconds)
    || value.challenge.timerSeconds < 0
    || typeof value.challenge.xpReward !== 'number'
    || !Number.isFinite(value.challenge.xpReward)
    || typeof value.challenge.gemsReward !== 'number'
    || !Number.isFinite(value.challenge.gemsReward)
    || !Array.isArray(value.questionResults)
    || value.questionResults.length !== value.challenge.questions.length) {
    return false
  }

  const questions: unknown[] = value.challenge.questions
  const results: unknown[] = value.questionResults
  const questionIds = new Set<string>()
  for (const question of questions) {
    if (!isRecord(question)
      || typeof question.id !== 'string'
      || question.id.length > 200
      || questionIds.has(question.id)
      || typeof question.prompt !== 'string'
      || question.prompt.length > 12_000
      || (question.imageUrl !== undefined && question.imageUrl !== null
        && (typeof question.imageUrl !== 'string' || question.imageUrl.length > 2_000))
      || (question.imageAlt !== undefined && question.imageAlt !== null
        && (typeof question.imageAlt !== 'string' || question.imageAlt.length > 500))
      || typeof question.allowsMultipleAnswers !== 'boolean'
      || !Array.isArray(question.options)
      || question.options.length < 2
      || question.options.length > 10
      || !question.options.every((option) =>
        isRecord(option)
        && typeof option.id === 'string'
        && option.id.length > 0
        && option.id.length <= 200
        && typeof option.text === 'string'
        && option.text.length <= 2_000,
      )) {
      return false
    }
    const options: unknown[] = question.options
    const optionIds = options.flatMap((option) =>
      isRecord(option) && typeof option.id === 'string' ? [option.id] : [],
    )
    if (new Set(optionIds).size !== options.length) {
      return false
    }
    questionIds.add(question.id)
  }

  const resultIds = new Set<string>()
  for (const result of results) {
    if (!isRecord(result)
      || typeof result.questionId !== 'string'
      || !questionIds.has(result.questionId)
      || resultIds.has(result.questionId)
      || typeof result.isCorrect !== 'boolean'
      || !isStringArray(result.correctOptionIds, 10, 200)
      || !isStringArray(result.selectedOptionIds, 10, 200)) {
      return false
    }
    const question = questions.find((item) =>
      isRecord(item) && item.id === result.questionId,
    )
    if (!isRecord(question) || !Array.isArray(question.options)) return false
    const options: unknown[] = question.options
    const optionIds = new Set(options.flatMap((option) =>
      isRecord(option) && typeof option.id === 'string' ? [option.id] : [],
    ))
    if ([...result.correctOptionIds, ...result.selectedOptionIds].some((id) => !optionIds.has(id))) {
      return false
    }
    resultIds.add(result.questionId)
  }
  return value.correctCount === results.filter(
    (result: unknown) => isRecord(result) && result.isCorrect === true,
  ).length
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submoduleId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { submoduleId } = await params
  try {
    const attempts = await prisma.$queryRaw<{ result: unknown }[]>`
      SELECT "result"
      FROM "PracticeBankAttempt"
      WHERE "userId" = ${authentication.appUser.id}
        AND "submoduleId" = ${submoduleId}
        AND "completedAt" IS NOT NULL
        AND "result" IS NOT NULL
      ORDER BY "completedAt" DESC, "createdAt" DESC
      LIMIT 10
    `
    return NextResponse.json({ attempts: attempts.map(({ result }) => result) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Failed to load synchronized Question Bank history.', error)
    return NextResponse.json({ error: 'Could not load attempt history.' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submoduleId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { submoduleId } = await params
  const contentLengthHeader = request.headers.get('content-length')
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0
  if (Number.isFinite(contentLength) && contentLength > 4_000_000) {
    return NextResponse.json({ error: 'Attempt history is too large to import.' }, { status: 413 })
  }

  let bodyText: string
  try {
    bodyText = await request.text()
  } catch {
    return NextResponse.json({ error: 'Could not read the request body.' }, { status: 400 })
  }
  if (bodyText.length > 4_000_000) {
    return NextResponse.json({ error: 'Attempt history is too large to import.' }, { status: 413 })
  }
  let body: unknown
  try {
    body = JSON.parse(bodyText)
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  const attempts = isRecord(body) && Array.isArray(body.attempts) ? body.attempts : null
  if (!attempts
    || attempts.length > 10
    || !attempts.every((attempt): attempt is LegacyBankAttempt =>
      isLegacyBankAttempt(attempt, submoduleId),
    )) {
    return NextResponse.json({ error: 'Legacy attempt history is invalid.' }, { status: 400 })
  }

  try {
    const importedCount = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${authentication.appUser.id}
        FOR UPDATE
      `
      const savedResults = await transaction.$queryRaw<{ result: unknown }[]>`
        SELECT "result"
        FROM "PracticeBankAttempt"
        WHERE "userId" = ${authentication.appUser.id}
          AND "submoduleId" = ${submoduleId}
          AND "completedAt" IS NOT NULL
          AND "result" IS NOT NULL
      `
      const importedLegacyIds = new Set(savedResults.flatMap(({ result }) =>
        isRecord(result) && typeof result.legacyId === 'string' ? [result.legacyId] : [],
      ))
      let imported = 0

      for (const attempt of attempts) {
        if (importedLegacyIds.has(attempt.id)) continue
        const id = crypto.randomUUID()
        const completedAt = attempt.completedAt ? new Date(attempt.completedAt) : new Date()
        const historyEntry = {
          ...attempt,
          id,
          legacyId: attempt.id,
          completedAt: completedAt.toISOString(),
        }
        await transaction.$executeRaw`
          INSERT INTO "PracticeBankAttempt"
            ("id", "userId", "submoduleId", "questionIds", "expiresAt", "completedAt", "result")
          VALUES (
            ${id},
            ${authentication.appUser.id},
            ${submoduleId},
            ARRAY(
              SELECT jsonb_array_elements_text(${JSON.stringify(
                attempt.challenge.questions.map((question) => question.id),
              )}::jsonb)
            ),
            ${completedAt},
            ${completedAt},
            ${JSON.stringify(historyEntry)}::jsonb
          )
        `
        importedLegacyIds.add(attempt.id)
        imported += 1
      }

      await transaction.$executeRaw`
        DELETE FROM "PracticeBankAttempt"
        WHERE "userId" = ${authentication.appUser.id}
          AND "submoduleId" = ${submoduleId}
          AND "completedAt" IS NOT NULL
          AND "id" NOT IN (
            SELECT "id"
            FROM "PracticeBankAttempt"
            WHERE "userId" = ${authentication.appUser.id}
              AND "submoduleId" = ${submoduleId}
              AND "completedAt" IS NOT NULL
            ORDER BY "completedAt" DESC, "createdAt" DESC
            LIMIT 10
          )
      `
      return imported
    })
    return NextResponse.json({ importedCount }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Failed to import local Question Bank history.', error)
    return NextResponse.json({ error: 'Could not sync local attempt history.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ submoduleId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { submoduleId } = await params
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
    || (body.attemptId !== null && typeof body.attemptId !== 'string')
  ) {
    return NextResponse.json({ error: 'Attempt history action is invalid.' }, { status: 400 })
  }

  try {
    const result = await prisma.practiceBankAttempt.deleteMany({
      where: {
        userId: authentication.appUser.id,
        submoduleId,
        completedAt: { not: null },
        ...(body.attemptId ? { id: body.attemptId } : {}),
      },
    })
    return NextResponse.json({ deletedCount: result.count }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Failed to update synchronized Question Bank history.', error)
    return NextResponse.json({ error: 'Could not update attempt history.' }, { status: 500 })
  }
}
