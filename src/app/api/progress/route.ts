import { NextResponse } from 'next/server'
import { PowerUpType, Prisma, RoadmapNodeType, RoadmapRewardCurrency } from '@prisma/client'
import { getChestBonusItem } from '@/src/lib/chestRewards'
import { authenticateAppUser } from '@/src/lib/auth/server'
import {
  getAppProfile,
  measureTimedOperation,
  recordActivityDay,
  recordReward,
  REWARDS,
  type OperationTimings,
} from '@/src/lib/gameEconomy'
import { syncDailyQuestRewards } from '@/src/lib/dailyQuestRewards'
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

  const requestedNodeId = body.nodeId
  let nodeLookupMs = 0
  let transactionMs = 0
  let profileMs = 0
  const operationTimings: OperationTimings = {}
  try {
    const nodeLookupStartedAt = performance.now()
    let node
    try {
      node = await prisma.roadmapNode.findFirst({
        where: { id: requestedNodeId, isPublished: true, chapter: { isPublished: true } },
        select: {
          id: true,
          chapterId: true,
          type: true,
          rewardCurrency: true,
          rewardAmount: true,
          content: true,
          questions: { select: { id: true } },
        },
      })
    } finally {
      operationTimings['node.lookupQueryMs'] = Math.round(performance.now() - nodeLookupStartedAt)
    }
    nodeLookupMs = Math.round(performance.now() - nodeLookupStartedAt)
    if (!node) return NextResponse.json({ error: 'This learning activity is unavailable.' }, { status: 404 })

    const attemptId = 'attemptId' in body && typeof body.attemptId === 'string' ? body.attemptId : null
    const isQuizActivity = node.type === RoadmapNodeType.QUIZ || node.type === RoadmapNodeType.BOSS
    if (isQuizActivity && !attemptId) {
      return NextResponse.json({ error: 'Submit the quiz answers before finishing the quiz.' }, { status: 400 })
    }
    if (!isQuizActivity && attemptId) {
      return NextResponse.json({ error: 'A quiz attempt cannot be used to finish this activity.' }, { status: 400 })
    }
    const isItemTreasure = node.type === RoadmapNodeType.TREASURE
      && !node.rewardCurrency
      && ['DOUBLE_XP', 'STREAK_FREEZE', 'HEART_REFILL'].includes(node.content)
    if (node.type === RoadmapNodeType.TREASURE
      && !isItemTreasure
      && (!node.rewardCurrency || !node.rewardAmount || node.rewardAmount < 10)) {
      return NextResponse.json({ error: 'This treasure reward is not configured.' }, { status: 500 })
    }

    const transactionStartedAt = performance.now()
    const result = await prisma.$transaction(async (transaction) => {
      let score: number | null = null
      if (attemptId) {
        const attempt = await measureTimedOperation(operationTimings, 'quiz.attemptLookupQueryMs', () => transaction.quizAttempt.findFirst({
          where: { id: attemptId, userId: authentication.appUser.id, nodeId: node.id },
          select: { id: true, completedAt: true },
        }))
        if (!attempt) throw new Error('QUIZ_ATTEMPT_NOT_FOUND')
        if (attempt.completedAt) {
          const previous = await measureTimedOperation(operationTimings, 'progress.previousReadQueryMs', () => transaction.nodeProgress.findUnique({
            where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
            select: { bestScore: true },
          }))
          const questRewards = await syncDailyQuestRewards(transaction, authentication.appUser.id, new Date(), operationTimings)
          return {
            alreadyCompleted: true,
            score: previous?.bestScore ?? null,
            xpAwarded: questRewards.xpAwarded,
            gemsAwarded: 0,
            quests: questRewards.quests,
          }
        }

        const answers = await measureTimedOperation(operationTimings, 'quiz.answersLookupQueryMs', () => transaction.quizAnswer.findMany({
          where: { attemptId: attempt.id },
          select: { isCorrect: true },
        }))
        if (answers.length !== node.questions.length || answers.length === 0) {
          throw new Error('QUIZ_ANSWERS_INCOMPLETE')
        }
        score = Math.round((answers.filter((answer) => answer.isCorrect).length / node.questions.length) * 100)
        await measureTimedOperation(operationTimings, 'quiz.attemptCompletionUpdateMs', () => transaction.quizAttempt.update({
          where: { id: attempt.id },
          data: { completedAt: new Date() },
        }))
      }

      const previousProgress = await measureTimedOperation(operationTimings, 'progress.previousReadQueryMs', () => transaction.nodeProgress.findUnique({
        where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
        select: { bestScore: true, completedAt: true },
      }))
      const bestScore = score === null
        ? previousProgress?.bestScore ?? null
        : Math.max(previousProgress?.bestScore ?? 0, score)
      await measureTimedOperation(operationTimings, 'progress.upsertQueryMs', () => transaction.nodeProgress.upsert({
        where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
        create: {
          id: crypto.randomUUID(),
          userId: authentication.appUser.id,
          nodeId: node.id,
          completedAt: new Date(),
          bestScore,
        },
        update: { completedAt: new Date(), bestScore },
      }))

      const remainingNodes = await measureTimedOperation(operationTimings, 'progress.remainingNodesQueryMs', () => transaction.roadmapNode.count({
        where: {
          chapterId: node.chapterId,
          isPublished: true,
          progress: { none: { userId: authentication.appUser.id, completedAt: { not: null } } },
        },
      }))
      if (remainingNodes === 0) {
        await measureTimedOperation(operationTimings, 'progress.chapterUpsertQueryMs', () => transaction.userProgress.upsert({
          where: { userId_chapterId: { userId: authentication.appUser.id, chapterId: node.chapterId } },
          create: {
            id: crypto.randomUUID(),
            userId: authentication.appUser.id,
            chapterId: node.chapterId,
            completed: true,
          },
          update: { completed: true },
        }))
      }

      const firstCompletion = !previousProgress?.completedAt
      const user = await measureTimedOperation(operationTimings, 'rewards.boostStateQueryMs', () => transaction.user.findUniqueOrThrow({
        where: { id: authentication.appUser.id },
        select: {
          doubleXpUntil: true,
          doubleGemsUntil: true,
          doubleGemsPausedAt: true,
        },
      }))
      const now = new Date()
      const xpMultiplier = user.doubleXpUntil && user.doubleXpUntil > now ? 2 : 1
      const gemBoostActive = Boolean(user.doubleGemsPausedAt)
        || Boolean(user.doubleGemsUntil && user.doubleGemsUntil > now)
      const gemMultiplier = gemBoostActive ? 2 : 1
      let xpAwarded = 0
      let gemsAwarded = 0
      if (firstCompletion) {
        const awarded = await recordReward(
          transaction,
          authentication.appUser.id,
          `node:${node.id}:completion`,
          REWARDS.firstCompletionXp * xpMultiplier,
          REWARDS.firstCompletionGems * gemMultiplier,
          operationTimings,
          'rewards.completion',
        )
        if (awarded) {
          xpAwarded += REWARDS.firstCompletionXp * xpMultiplier
          gemsAwarded += REWARDS.firstCompletionGems * gemMultiplier
        }
        if (node.type === RoadmapNodeType.TREASURE) {
          if (node.rewardCurrency && node.rewardAmount) {
            const treasureXp = node.rewardCurrency === RoadmapRewardCurrency.XP
              ? node.rewardAmount * xpMultiplier
              : 0
            const treasureGems = node.rewardCurrency === RoadmapRewardCurrency.GEMS
              ? node.rewardAmount * gemMultiplier
              : 0
            const treasureAwarded = await recordReward(
              transaction,
              authentication.appUser.id,
              `node:${node.id}:treasure`,
              treasureXp,
              treasureGems,
              operationTimings,
              'rewards.treasure',
            )
            if (treasureAwarded) {
              xpAwarded += treasureXp
              gemsAwarded += treasureGems
            }
          } else if (!node.rewardCurrency && ['DOUBLE_XP', 'STREAK_FREEZE', 'HEART_REFILL'].includes(node.content)) {
            const itemCode = node.content
            if (itemCode === 'DOUBLE_XP') {
              const currentDoubleXp = user.doubleXpUntil && user.doubleXpUntil > now
                ? user.doubleXpUntil.getTime()
                : now.getTime()
              const doubleXpUntil = new Date(currentDoubleXp + 15 * 60_000)
              await transaction.user.update({
                where: { id: authentication.appUser.id },
                data: { doubleXpUntil },
              })
            } else if (itemCode === 'STREAK_FREEZE') {
              const freezeProduct = await transaction.powerUp.upsert({
                where: { code: PowerUpType.STREAK_FREEZE },
                create: {
                  code: PowerUpType.STREAK_FREEZE,
                  name: 'Streak Freeze',
                  description: 'Protect one missed day of your streak.',
                  icon: 'snowflake',
                  costGems: 200,
                },
                update: {},
                select: { id: true },
              })
              await transaction.userPowerUp.upsert({
                where: { userId_powerUpId: { userId: authentication.appUser.id, powerUpId: freezeProduct.id } },
                create: { id: crypto.randomUUID(), userId: authentication.appUser.id, powerUpId: freezeProduct.id, quantity: 1 },
                update: { quantity: { increment: 1 } },
              })
            } else if (itemCode === 'HEART_REFILL') {
              await transaction.user.update({
                where: { id: authentication.appUser.id },
                data: { hearts: 5 },
              })
            }
          }
        }
      }
      if (score === 100) {
        const awarded = await recordReward(
          transaction,
          authentication.appUser.id,
          `node:${node.id}:perfect`,
          REWARDS.perfectQuizXp * xpMultiplier,
          0,
          operationTimings,
          'rewards.perfectQuiz',
        )
        if (awarded) xpAwarded += REWARDS.perfectQuizXp * xpMultiplier
      }
      await recordActivityDay(transaction, authentication.appUser.id, now, operationTimings)
      const questRewards = await syncDailyQuestRewards(transaction, authentication.appUser.id, now, operationTimings)
      xpAwarded += questRewards.xpAwarded
      return { alreadyCompleted: false, score, xpAwarded, gemsAwarded, quests: questRewards.quests }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    })

    transactionMs = Math.round(performance.now() - transactionStartedAt)
    const profileStartedAt = performance.now()
    const profile = await getAppProfile(authentication.appUser.id, operationTimings)
    profileMs = Math.round(performance.now() - profileStartedAt)
    if (!profile) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })
    const totalMs = Math.round(performance.now() - requestStartedAt)
    console.info('Progress completion request timing.', {
      authenticationMs,
      tokenVerificationMs,
      appUserLookupMs,
      nodeLookupMs,
      transactionMs,
      profileMs,
      operationTimings,
      totalMs,
    })
    return NextResponse.json({
      completed: true,
      score: result.score,
      alreadyCompleted: result.alreadyCompleted,
      rewards: { xp: result.xpAwarded, gems: result.gemsAwarded },
      profile,
      quests: result.quests,
    }, {
      headers: {
        'Cache-Control': 'no-store',
        'Server-Timing': `token;dur=${tokenVerificationMs}, user-lookup;dur=${appUserLookupMs}, node;dur=${nodeLookupMs}, transaction;dur=${transactionMs}, profile;dur=${profileMs}, total;dur=${totalMs}`,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'QUIZ_ATTEMPT_NOT_FOUND') {
      return NextResponse.json({ error: 'This quiz attempt is unavailable.' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'QUIZ_ANSWERS_INCOMPLETE') {
      return NextResponse.json({ error: 'Answer every question before finishing the quiz.' }, { status: 409 })
    }
    console.error('Failed to save learner progress.', error)
    console.error('Progress completion request timing.', {
      authenticationMs,
      tokenVerificationMs,
      appUserLookupMs,
      nodeLookupMs,
      transactionMs,
      operationTimings,
      totalMs: Math.round(performance.now() - requestStartedAt),
    })
    return NextResponse.json({ error: 'Could not save learning progress.' }, { status: 500 })
  }
}
