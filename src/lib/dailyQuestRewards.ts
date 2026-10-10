import { RoadmapNodeType, type Prisma } from '@prisma/client'
import { getDailyQuestSet, jakartaDateKey, type DailyQuest } from '@/src/lib/dailyQuests'
import { recordReward, shiftDateKey } from '@/src/lib/gameEconomy'

export type DailyQuestSnapshot = DailyQuest & {
  current: number
  completed: boolean
  rewarded: boolean
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
): Promise<{ quests: DailyQuestSnapshot[]; xpAwarded: number }> {
  const date = jakartaDateKey(now)
  const { start, end } = getDateRange(date)
  const [nodeCounts, chapterCount, activities, quizAttempts] = await Promise.all([
    transaction.roadmapNode.groupBy({
      by: ['type'],
      where: { isPublished: true, chapter: { isPublished: true } },
      _count: { _all: true },
    }),
    transaction.chapter.count({
      where: { isPublished: true, nodes: { some: { isPublished: true } } },
    }),
    transaction.nodeProgress.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      select: { node: { select: { type: true, chapterId: true } } },
    }),
    transaction.quizAttempt.findMany({
      where: { userId, completedAt: { gte: start, lt: end } },
      select: {
        node: { select: { _count: { select: { questions: true } } } },
        answers: { select: { isCorrect: true } },
      },
    }),
  ])
  if (nodeCounts.length === 0) return { quests: [], xpAwarded: 0 }

  const nodeCountByType = new Map(nodeCounts.map((entry) => [entry.type, entry._count._all]))
  const quests = getDailyQuestSet(userId, date, {
    hasLessons: (nodeCountByType.get(RoadmapNodeType.LESSON) ?? 0) > 0,
    hasQuizzes: (nodeCountByType.get(RoadmapNodeType.QUIZ) ?? 0) > 0
      || (nodeCountByType.get(RoadmapNodeType.BOSS) ?? 0) > 0,
    hasMultipleChapters: chapterCount > 1,
  })
  const perfectQuizzes = quizAttempts.filter((attempt) =>
    attempt.node._count.questions > 0
    && attempt.answers.length === attempt.node._count.questions
    && attempt.answers.every((answer) => answer.isCorrect)).length
  const progress = {
    lessons: activities.filter((activity) => activity.node.type === RoadmapNodeType.LESSON).length,
    quizzes: quizAttempts.length,
    perfectQuizzes,
    activities: activities.length,
    chapters: new Set(activities.map((activity) => activity.node.chapterId)).size,
  }
  const rewardKeys = quests.map((quest) => `daily-quest:${date}:${quest.id}`)
  const existingRewards = await transaction.rewardEvent.findMany({
    where: { userId, idempotencyKey: { in: rewardKeys } },
    select: { idempotencyKey: true },
  })
  const rewardedKeys = new Set(existingRewards.map((reward) => reward.idempotencyKey))
  let xpAwarded = 0

  for (const quest of quests) {
    const rewardKey = `daily-quest:${date}:${quest.id}`
    const completed = progress[quest.metric] >= quest.target
    if (completed && !rewardedKeys.has(rewardKey)) {
      const awarded = await recordReward(transaction, userId, rewardKey, quest.xpReward, 0)
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
