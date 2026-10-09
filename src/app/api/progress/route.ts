import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
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
    || ('score' in body && body.score !== undefined
      && (typeof body.score !== 'number' || !Number.isInteger(body.score) || body.score < 0 || body.score > 100))
  ) {
    return NextResponse.json({ error: 'Progress data is invalid.' }, { status: 400 })
  }

  try {
    const node = await prisma.roadmapNode.findFirst({
      where: { id: body.nodeId, isPublished: true, chapter: { isPublished: true } },
      select: { id: true, chapterId: true },
    })
    if (!node) return NextResponse.json({ error: 'This learning activity is unavailable.' }, { status: 404 })

    const score = 'score' in body && typeof body.score === 'number' ? body.score : null
    await prisma.$transaction(async (transaction) => {
      const previousProgress = await transaction.nodeProgress.findUnique({
        where: { userId_nodeId: { userId: authentication.appUser.id, nodeId: node.id } },
        select: { bestScore: true },
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
        update: {
          completedAt: new Date(),
          bestScore,
        },
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
    })
    return NextResponse.json({ completed: true })
  } catch (error) {
    console.error('Failed to save learner progress.', error)
    return NextResponse.json({ error: 'Could not save learning progress.' }, { status: 500 })
  }
}
