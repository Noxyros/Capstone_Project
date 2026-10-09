import { PowerUpType, Prisma } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { AppProfile } from '@/src/lib/appProfile'

export const REWARDS = {
  firstCompletionXp: 20,
  firstCompletionGems: 20,
  perfectQuizXp: 10,
  doubleXpMinutes: 15,
  sacrificeBoostMinutes: 7,
} as const

export const POWER_UP_PRICES: Record<PowerUpType, number> = {
  [PowerUpType.HEART_REFILL]: 250,
  [PowerUpType.DOUBLE_XP]: 100,
  [PowerUpType.STREAK_FREEZE]: 200,
}

export const POWER_UP_CATALOG = {
  [PowerUpType.HEART_REFILL]: {
    name: 'Heart Refill',
    description: 'Restore all hearts.',
    icon: 'heart',
  },
  [PowerUpType.DOUBLE_XP]: {
    name: 'Double XP Boost',
    description: 'Double lesson XP for 15 minutes.',
    icon: 'zap',
  },
  [PowerUpType.STREAK_FREEZE]: {
    name: 'Streak Freeze',
    description: 'Protect one missed day of your streak.',
    icon: 'snowflake',
  },
} satisfies Record<PowerUpType, { name: string; description: string; icon: string }>

export function jakartaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10)
}

export function jakartaWeekStart(dateKey = jakartaDateKey()): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  const daysSinceMonday = (date.getUTCDay() + 6) % 7
  return shiftDateKey(dateKey, -daysSinceMonday)
}

export async function getAppProfile(userId: string): Promise<AppProfile | null> {
  const today = jakartaDateKey()
  const weekStart = jakartaWeekStart(today)
  const monthStart = `${today.slice(0, 7)}-01`
  const weekStartInstant = new Date(`${weekStart}T00:00:00+07:00`)

  const [user, weeklyTotals, students] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        handle: true,
        avatarUrl: true,
        role: true,
        streak: true,
        totalXp: true,
        gems: true,
        hearts: true,
        maxHearts: true,
        superMode: true,
        doubleXpUntil: true,
        createdAt: true,
        powerUps: {
          where: { powerUp: { code: PowerUpType.STREAK_FREEZE } },
          select: { quantity: true },
        },
        activityDays: {
          where: { date: { gte: monthStart, lte: today } },
          orderBy: { date: 'asc' },
          select: { date: true },
        },
      },
    }),
    prisma.rewardEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: weekStartInstant } },
      _sum: { xpDelta: true },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, handle: true },
    }),
  ])
  if (!user) return null

  const xpByUser = new Map(weeklyTotals.map((entry) => [entry.userId, entry._sum.xpDelta ?? 0]))
  const totals = students
    .map((student) => ({
      userId: student.id,
      displayName: student.handle ?? student.name ?? student.id,
      xp: xpByUser.get(student.id) ?? 0,
    }))
    .sort((left, right) => right.xp - left.xp || left.displayName.localeCompare(right.displayName))
  const weeklyXp = totals.find((entry) => entry.userId === userId)?.xp ?? 0
  const rank = Math.max(1, totals.findIndex((entry) => entry.userId === userId) + 1)

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    role: user.role,
    streak: user.streak,
    totalXp: user.totalXp,
    weeklyXp,
    gems: user.gems,
    hearts: user.hearts,
    maxHearts: user.maxHearts,
    superMode: user.superMode,
    doubleXpUntil: user.doubleXpUntil?.toISOString() ?? null,
    streakFreezeCount: user.powerUps[0]?.quantity ?? 0,
    createdAt: user.createdAt.toISOString(),
    rank,
    activityDates: user.activityDays.map((activity) => activity.date),
  }
}

export async function recordActivityDay(
  transaction: Prisma.TransactionClient,
  userId: string,
  now = new Date(),
): Promise<void> {
  const date = jakartaDateKey(now)
  const inserted = await transaction.activityDay.createMany({
    data: [{ id: crypto.randomUUID(), userId, date }],
    skipDuplicates: true,
  })
  if (inserted.count === 0) return

  const user = await transaction.user.findUnique({
    where: { id: userId },
    select: { streak: true, lastActivityDate: true },
  })
  if (!user || user.lastActivityDate === date) return

  let nextStreak = user.lastActivityDate === shiftDateKey(date, -1)
    ? user.streak + 1
    : 1
  if (user.lastActivityDate === shiftDateKey(date, -2)) {
    const freeze = await transaction.userPowerUp.findFirst({
      where: {
        userId,
        quantity: { gt: 0 },
        powerUp: { code: PowerUpType.STREAK_FREEZE },
      },
      select: { id: true },
    })
    if (freeze) {
      const consumed = await transaction.userPowerUp.updateMany({
        where: { id: freeze.id, quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } },
      })
      if (consumed.count === 1) nextStreak = user.streak + 1
    }
  }

  await transaction.user.update({
    where: { id: userId },
    data: { streak: nextStreak, lastActivityDate: date, lastActive: now },
  })
}

export async function recordReward(
  transaction: Prisma.TransactionClient,
  userId: string,
  idempotencyKey: string,
  xpDelta: number,
  gemsDelta: number,
): Promise<boolean> {
  const inserted = await transaction.rewardEvent.createMany({
    data: [{
      id: crypto.randomUUID(),
      userId,
      idempotencyKey,
      xpDelta,
      gemsDelta,
    }],
    skipDuplicates: true,
  })
  if (inserted.count === 0) return false

  await transaction.user.update({
    where: { id: userId },
    data: {
      ...(xpDelta ? { totalXp: { increment: xpDelta } } : {}),
      ...(gemsDelta ? { gems: { increment: gemsDelta } } : {}),
    },
  })
  return true
}
