import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { jakartaWeekStart } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const weekStart = jakartaWeekStart()
    const weekStartInstant = new Date(`${weekStart}T00:00:00+07:00`)
    const [students, weeklyRewards] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true, name: true, handle: true, avatarUrl: true },
      }),
      prisma.rewardEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: weekStartInstant } },
        _sum: { xpDelta: true },
      }),
    ])
    const xpByUser = new Map(weeklyRewards.map((entry) => [entry.userId, entry._sum.xpDelta ?? 0]))
    const sortedStudents = students
      .map((student) => ({ ...student, weeklyXp: xpByUser.get(student.id) ?? 0 }))
      .sort((left, right) => right.weeklyXp - left.weeklyXp
        || (left.handle ?? left.name ?? left.id).localeCompare(right.handle ?? right.name ?? right.id))
    const ranked = sortedStudents.map((student, index) => ({ ...student, rank: index + 1 }))
    const currentStudent = ranked.find((student) => student.id === authentication.appUser.id)
    const topRows = ranked.slice(0, 50)
    if (currentStudent && !topRows.some((student) => student.id === currentStudent.id)) {
      topRows.push(currentStudent)
    }

    return NextResponse.json({
      weekStart,
      rows: topRows,
      currentUserId: authentication.appUser.id,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load the weekly learner leaderboard.', error)
    return NextResponse.json({ error: 'Could not load the leaderboard.' }, { status: 500 })
  }
}
