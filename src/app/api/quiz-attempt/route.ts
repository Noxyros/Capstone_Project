import { NextResponse } from 'next/server'
import { RoadmapNodeType } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { syncHeartRegeneration } from '@/src/lib/gameEconomy'
import { prisma } from '@/src/lib/prisma'

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
  if (typeof body !== 'object' || body === null || !('nodeId' in body) || typeof body.nodeId !== 'string') {
    return NextResponse.json({ error: 'Quiz selection is invalid.' }, { status: 400 })
  }

  try {
    const [node, user] = await Promise.all([
      prisma.roadmapNode.findFirst({
        where: {
          id: body.nodeId,
          type: { in: [RoadmapNodeType.QUIZ, RoadmapNodeType.BOSS] },
          isPublished: true,
          chapter: { isPublished: true },
        },
        select: { id: true },
      }),
      prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: authentication.appUser.id },
          select: { hearts: true, maxHearts: true, heartRefillAt: true, superMode: true },
        })
        if (!user) return null

        const { hearts, heartRefillAt } = syncHeartRegeneration(
          user.hearts,
          user.maxHearts,
          user.heartRefillAt,
        )
        if (
          hearts !== user.hearts
          || heartRefillAt?.getTime() !== user.heartRefillAt?.getTime()
        ) {
          await transaction.user.update({
            where: { id: authentication.appUser.id },
            data: { hearts, heartRefillAt },
          })
        }

        return { hearts, superMode: user.superMode }
      }),
    ])
    if (!node) return NextResponse.json({ error: 'This quiz is unavailable.' }, { status: 404 })
    if (!user) return NextResponse.json({ error: 'Your learner account could not be found.' }, { status: 404 })
    if (user.hearts <= 0 && !user.superMode) {
      return NextResponse.json({ error: 'You are out of hearts. Refill your hearts or activate Super Mode to continue.' }, { status: 409 })
    }

    const attempt = await prisma.quizAttempt.create({
      data: { id: crypto.randomUUID(), userId: authentication.appUser.id, nodeId: node.id },
      select: { id: true },
    })
    return NextResponse.json({ attemptId: attempt.id }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to start quiz attempt.', error)
    return NextResponse.json({ error: 'Could not start this quiz. Please try again.' }, { status: 500 })
  }
}
