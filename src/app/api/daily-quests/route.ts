import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { getAppProfile, jakartaDateKey } from '@/src/lib/gameEconomy'
import { syncDailyQuestRewards } from '@/src/lib/dailyQuestRewards'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const date = jakartaDateKey()
    const result = await prisma.$transaction((transaction) =>
      syncDailyQuestRewards(transaction, authentication.appUser.id))
    const profile = result.xpAwarded > 0
      ? await getAppProfile(authentication.appUser.id)
      : null
    return NextResponse.json({
      date,
      quests: result.quests,
      ...(profile ? { profile } : {}),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load daily quests.', error)
    return NextResponse.json({ error: 'Could not load daily quests.' }, { status: 500 })
  }
}
