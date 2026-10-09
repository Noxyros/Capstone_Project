import { NextResponse } from 'next/server'
import { Prisma, RoadmapNodeType } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { getAppProfile, recordActivityDay, recordReward, REWARDS } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const progress = await prisma.nodeProgress.findMany({
      where: { userId: authentication.appUser.id, completedAt: { not: null } },
      select: { nodeId: true },
    })
    return NextResponse.json({ completedNodeIds: progress.map((item) => item.nodeId) })
  } catch (error) {
    console.error('Failed to load learner progress.', error)
    return NextResponse.json({ error: 'Could not load learning progress.' }, { status: 500 })
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
    || !('nodeId' in body)
    || typeof body.nodeId !== 'string'
    || !body.nodeId.trim()
    || body.nodeId.length > 200
    || ('attemptId' in body && body.attemptId !== undefined
      && (typeof body.attemptId !== 'string' || body.attemptId.length > 100))
  ) {
    return NextResponse.json({ error: 'Progress data is invalid.' }, { status: 400 })
  }

  try {
    const node = await prisma.roadmapNode.findFirst({
      where: { id: body.nodeId, isPublished: true, chapter: { isPublished: true } },
      select: {
        id: true,
        chapterId: true,
        type: true,
        questions: { select: { id: true } },
      },
    })
    if (!node) return NextResponse.json({ error: 'This learning activity is unavailable.' }, { status: 404 })

    const attemptId = 'attemptId' in body && typeof body.attemptId === 'string' ? body.attemptId : null
    if (node.type === RoadmapNodeType.QUIZ && !attemptId) {
      return NextResponse.json({ error: 'Submit the quiz answers before finishing the quiz.' }, { status: 400 })
    }
    if (node.type !== RoadmapNodeType.QUIZ && attemptId) {
      return NextResponse.json({ error: 'A quiz attempt cannot be used to finish this lesson.' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (transaction) => {
      let score: number | null = null
      if (attemptId) {
        const attempt = await transaction.quizAttempt.findFirst({
          where: { id: attemptId, userId: authentication.appUser.id, nodeId: node.id },
          select: { id: true, completedAt: true },
        })
        if (!attempt) throw new Error('QUIZ_ATTEMPT_NOT_FOUND')
        if (attempt.completedAt) {
          const previous = await transaction.nodeProgress.findUnique({
            where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
            select: { bestScore: true },
          })
          return { alreadyCompleted: true, score: previous?.bestScore ?? null, xpAwarded: 0, gemsAwarded: 0 }
        }

        const answers = await transaction.quizAnswer.findMany({
          where: { attemptId: attempt.id },
          select: { isCorrect: true },
        })
        if (answers.length !== node.questions.length || answers.length === 0) {
          throw new Error('QUIZ_ANSWERS_INCOMPLETE')
        }
        score = Math.round((answers.filter((answer) => answer.isCorrect).length / node.questions.length) * 100)
        await transaction.quizAttempt.update({
          where: { id: attempt.id },
          data: { completedAt: new Date() },
        })
      }

      const previousProgress = await transaction.nodeProgress.findUnique({
        where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
        select: { bestScore: true, completedAt: true },
      })
      const bestScore = score === null
        ? previousProgress?.bestScore ?? null
        : Math.max(previousProgress?.bestScore ?? 0, score)
      await transaction.nodeProgress.upsert({
        where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
        create: {
          id: crypto.randomUUID(),
          userId: authentication.appUser.id,
          nodeId: node.id,
          completedAt: new Date(),
          bestScore,
        },
        update: { completedAt: previousProgress?.completedAt ?? new Date(), bestScore },
      })

      const remainingNodes = await transaction.roadmapNode.count({
        where: {
          chapterId: node.chapterId,
          isPublished: true,
          progress: { none: { userId: authentication.appUser.id, completedAt: { not: null } } },
        },
      })
      if (remainingNodes === 0) {
        await transaction.userProgress.upsert({
          where: { userId_chapterId: { userId: authentication.appUser.id, chapterId: node.chapterId } },
          create: {
            id: crypto.randomUUID(),
            userId: authentication.appUser.id,
            chapterId: node.chapterId,
            completed: true,
          },
          update: { completed: true },
        })
      }

      const firstCompletion = !previousProgress?.completedAt
      const user = await transaction.user.findUniqueOrThrow({
        where: { id: authentication.appUser.id },
        select: { doubleXpUntil: true },
      })
      const xpMultiplier = user.doubleXpUntil && user.doubleXpUntil > new Date() ? 2 : 1
      let xpAwarded = 0
      let gemsAwarded = 0
      if (firstCompletion) {
        const awarded = await recordReward(
          transaction,
          authentication.appUser.id,
          `node:${node.id}:completion`,
          REWARDS.firstCompletionXp * xpMultiplier,
          REWARDS.firstCompletionGems,
        )
        if (awarded) {
          xpAwarded += REWARDS.firstCompletionXp * xpMultiplier
          gemsAwarded += REWARDS.firstCompletionGems
        }
      }
      if (score === 100) {
        const awarded = await recordReward(
          transaction,
          authentication.appUser.id,
          `node:${node.id}:perfect`,
          REWARDS.perfectQuizXp * xpMultiplier,
          0,
        )
        if (awarded) xpAwarded += REWARDS.perfectQuizXp * xpMultiplier
      }
      await recordActivityDay(transaction, authentication.appUser.id)
      return { alreadyCompleted: false, score, xpAwarded, gemsAwarded }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    const profile = await getAppProfile(authentication.appUser.id)
    if (!profile) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })
    return NextResponse.json({
      completed: true,
      score: result.score,
      alreadyCompleted: result.alreadyCompleted,
      rewards: { xp: result.xpAwarded, gems: result.gemsAwarded },
      profile,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'QUIZ_ATTEMPT_NOT_FOUND') {
      return NextResponse.json({ error: 'This quiz attempt is unavailable.' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'QUIZ_ANSWERS_INCOMPLETE') {
      return NextResponse.json({ error: 'Answer every question before finishing the quiz.' }, { status: 409 })
    }
    console.error('Failed to save learner progress.', error)
    return NextResponse.json({ error: 'Could not save learning progress.' }, { status: 500 })
  }
}
