import { NextResponse } from 'next/server'
import { PowerUpType, Prisma } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { getAppProfile, POWER_UP_CATALOG, POWER_UP_PRICES, REWARDS, recordReward } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

class GameActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function isPowerUpType(value: unknown): value is PowerUpType {
  return typeof value === 'string' && Object.values(PowerUpType).includes(value as PowerUpType)
}

export async function PATCH(request: Request) {
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
  if (typeof body !== 'object' || body === null || !('action' in body) || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'Game action is invalid.' }, { status: 400 })
  }

  try {
    if (body.action === 'set_super_mode') {
      if (!('enabled' in body) || typeof body.enabled !== 'boolean') {
        return NextResponse.json({ error: 'Super Mode selection is invalid.' }, { status: 400 })
      }
      await prisma.user.update({
        where: { id: authentication.appUser.id },
        data: { superMode: body.enabled },
      })
      return NextResponse.json(
        { superMode: body.enabled },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    } else if (body.action === 'purchase') {
      if (!('code' in body) || !isPowerUpType(body.code)) {
        return NextResponse.json({ error: 'Power-up selection is invalid.' }, { status: 400 })
      }
      const code = body.code
      const price = POWER_UP_PRICES[code]
      const catalog = POWER_UP_CATALOG[code]
      await prisma.$transaction(async (transaction) => {
        const [user, product] = await Promise.all([
          transaction.user.findUnique({
            where: { id: authentication.appUser.id },
            select: { gems: true, hearts: true, maxHearts: true, superMode: true, doubleXpUntil: true },
          }),
          transaction.powerUp.upsert({
            where: { code },
            create: { code, ...catalog, costGems: price },
            update: { ...catalog, costGems: price },
            select: { id: true },
          }),
        ])
        if (!user) throw new GameActionError('Your learner account could not be found.', 404)
        if (user.gems < price) throw new GameActionError('You do not have enough gems for this power-up.', 409)

        const now = new Date()
        if (code === PowerUpType.HEART_REFILL) {
          if (user.superMode) {
            throw new GameActionError('Turn off Super Mode before refilling hearts.', 409)
          }
          if (user.hearts >= user.maxHearts) throw new GameActionError('Your hearts are already full.', 409)
          const refill = await transaction.user.updateMany({
            where: {
              id: authentication.appUser.id,
              superMode: false,
              hearts: { lt: user.maxHearts },
            },
            data: { hearts: user.maxHearts },
          })
          if (refill.count !== 1) {
            throw new GameActionError('Super Mode is active or your hearts are already full.', 409)
          }
        } else if (code === PowerUpType.DOUBLE_XP) {
          if (user.doubleXpUntil && user.doubleXpUntil > now) {
            throw new GameActionError('A Double XP boost is already active.', 409)
          }
          await transaction.user.update({
            where: { id: authentication.appUser.id },
            data: { doubleXpUntil: new Date(now.getTime() + REWARDS.doubleXpMinutes * 60_000) },
          })
        } else {
          const existing = await transaction.userPowerUp.findUnique({
            where: { userId_powerUpId: { userId: authentication.appUser.id, powerUpId: product.id } },
            select: { quantity: true },
          })
          if ((existing?.quantity ?? 0) >= 2) {
            throw new GameActionError('You already have the maximum number of Streak Freezes.', 409)
          }
          await transaction.userPowerUp.upsert({
            where: { userId_powerUpId: { userId: authentication.appUser.id, powerUpId: product.id } },
            create: { id: crypto.randomUUID(), userId: authentication.appUser.id, powerUpId: product.id, quantity: 1 },
            update: { quantity: { increment: 1 } },
          })
        }
        await recordReward(
          transaction,
          authentication.appUser.id,
          `purchase:${crypto.randomUUID()}`,
          0,
          -price,
        )
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } else if (body.action === 'activate_heart_surge') {
      await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: authentication.appUser.id },
          select: { hearts: true, superMode: true, doubleXpUntil: true },
        })
        if (!user) throw new GameActionError('Your learner account could not be found.', 404)
        if (user.superMode) throw new GameActionError('Turn off Super Mode before trading hearts for a boost.', 409)
        if (user.hearts <= 4) throw new GameActionError('You need at least 5 hearts to activate this boost.', 409)
        if (user.doubleXpUntil && user.doubleXpUntil > new Date()) {
          throw new GameActionError('A Double XP boost is already active.', 409)
        }
        const updated = await transaction.user.updateMany({
          where: { id: authentication.appUser.id, hearts: { gt: 4 } },
          data: {
            hearts: { decrement: 4 },
            doubleXpUntil: new Date(Date.now() + REWARDS.sacrificeBoostMinutes * 60_000),
          },
        })
        if (updated.count !== 1) throw new GameActionError('Your heart balance changed. Please try again.', 409)
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } else {
      return NextResponse.json({ error: 'Game action is not supported.' }, { status: 400 })
    }

    const profile = await getAppProfile(authentication.appUser.id)
    if (!profile) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })
    return NextResponse.json(profile, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof GameActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to update learner game state.', error)
    return NextResponse.json({ error: 'Could not update your learner account. Please try again.' }, { status: 500 })
  }
}
