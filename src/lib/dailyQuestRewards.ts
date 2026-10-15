import type { Prisma } from '@prisma/client'
import { getDailyQuestSet, jakartaDateKey, type DailyQuest } from '@/src/lib/dailyQuests'
import { measureTimedOperation, recordReward, shiftDateKey, type OperationTimings } from '@/src/lib/gameEconomy'

export type DailyQuestSnapshot = DailyQuest & {
  current: number
  completed: boolean
  rewarded: boolean
}

type DailyQuestMetricsRow = {
  publishedNodeCount: bigint
  lessonNodeCount: bigint
  quizNodeCount: bigint
  publishedChapterCount: bigint
  lessons: bigint
  quizzes: bigint
  perfectQuizzes: bigint
  activities: bigint
  chapters: bigint
}

function getDateRange(date: string): { start: Date; end: Date } {
  return {
    start: new Date(`${date}T00:00:00+07:00`),
    end: new Date(`${shiftDateKey(date, 1)}T00:00:00+07:00`),
  }
}

export async function syncDailyQuestRewards(
  transaction: Prisma.TransactionClient,
  userId: string,
  now = new Date(),
  timings?: OperationTimings,
): Promise<{ quests: DailyQuestSnapshot[]; xpAwarded: number }> {
  const date = jakartaDateKey(now)
  const { start, end } = getDateRange(date)
  const [metrics] = await measureTimedOperation(timings, 'quests.metricsQueryMs', () =>
    transaction.$queryRaw<DailyQuestMetricsRow[]>`
      WITH node_availability AS (
        SELECT
          COUNT(*) AS published_node_count,
          COUNT(*) FILTER (WHERE node.type::text = 'LESSON') AS lesson_node_count,
          COUNT(*) FILTER (WHERE node.type::text IN ('QUIZ', 'BOSS')) AS quiz_node_count,
          COUNT(DISTINCT node."chapterId") AS published_chapter_count
        FROM "RoadmapNode" AS node
        INNER JOIN "Chapter" AS chapter ON chapter.id = node."chapterId"
        WHERE node."isPublished" = TRUE
          AND chapter."isPublished" = TRUE
      ),
      activity_metrics AS (
        SELECT
          COUNT(*) AS activities,
          COUNT(*) FILTER (WHERE node.type::text = 'LESSON') AS lessons,
          COUNT(DISTINCT node."chapterId") AS chapters
        FROM "NodeProgress" AS progress
        INNER JOIN "RoadmapNode" AS node ON node.id = progress."nodeId"
        WHERE progress."userId" = ${userId}
          AND progress."completedAt" >= ${start}
          AND progress."completedAt" < ${end}
      ),
      quiz_attempt_scores AS (
        SELECT
          attempt.id,
          (
            SELECT COUNT(*)
            FROM "Question" AS question
            WHERE question."nodeId" = attempt."nodeId"
          ) AS question_count,
          COUNT(answer.id) AS answer_count,
          COALESCE(BOOL_AND(answer."isCorrect"), FALSE) AS all_correct
        FROM "QuizAttempt" AS attempt
        LEFT JOIN "QuizAnswer" AS answer ON answer."attemptId" = attempt.id
        WHERE attempt."userId" = ${userId}
          AND attempt."completedAt" >= ${start}
          AND attempt."completedAt" < ${end}
        GROUP BY attempt.id
      ),
      quiz_metrics AS (
        SELECT
          COUNT(*) AS quizzes,
          COUNT(*) FILTER (
            WHERE question_count > 0
              AND answer_count = question_count
              AND all_correct
          ) AS perfect_quizzes
        FROM quiz_attempt_scores
      )
      SELECT
        node_availability.published_node_count AS "publishedNodeCount",
        node_availability.lesson_node_count AS "lessonNodeCount",
        node_availability.quiz_node_count AS "quizNodeCount",
        node_availability.published_chapter_count AS "publishedChapterCount",
        activity_metrics.lessons AS lessons,
        quiz_metrics.quizzes AS quizzes,
        quiz_metrics.perfect_quizzes AS "perfectQuizzes",
        activity_metrics.activities AS activities,
        activity_metrics.chapters AS chapters
      FROM node_availability
      CROSS JOIN activity_metrics
      CROSS JOIN quiz_metrics
    `,
  )
  if (!metrics || metrics.publishedNodeCount === 0n) return { quests: [], xpAwarded: 0 }

  const quests = getDailyQuestSet(userId, date, {
    hasLessons: metrics.lessonNodeCount > 0n,
    hasQuizzes: metrics.quizNodeCount > 0n,
    hasMultipleChapters: metrics.publishedChapterCount > 1n,
  })
  const progress: Record<DailyQuest['metric'], number> = {
    lessons: Number(metrics.lessons),
    quizzes: Number(metrics.quizzes),
    perfectQuizzes: Number(metrics.perfectQuizzes),
    activities: Number(metrics.activities),
    chapters: Number(metrics.chapters),
  }
  const rewardKeys = quests.map((quest) => `daily-quest:${date}:${quest.id}`)
  const existingRewards = await measureTimedOperation(timings, 'quests.rewardLookupQueryMs', () => transaction.rewardEvent.findMany({
    where: { userId, idempotencyKey: { in: rewardKeys } },
    select: { idempotencyKey: true },
  }))
  const rewardedKeys = new Set(existingRewards.map((reward) => reward.idempotencyKey))
  let xpAwarded = 0

  for (const quest of quests) {
    const rewardKey = `daily-quest:${date}:${quest.id}`
    const completed = progress[quest.metric] >= quest.target
    if (completed && !rewardedKeys.has(rewardKey)) {
      const awarded = await recordReward(
        transaction,
        userId,
        rewardKey,
        quest.xpReward,
        0,
        timings,
        `quests.reward.${quest.id}`,
      )
      if (awarded) xpAwarded += quest.xpReward
      rewardedKeys.add(rewardKey)
    }
  }

  return {
    quests: quests.map((quest) => {
      const current = progress[quest.metric]
      return {
        ...quest,
        current,
        completed: current >= quest.target,
        rewarded: rewardedKeys.has(`daily-quest:${date}:${quest.id}`),
      }
    }),
    xpAwarded,
  }
}
