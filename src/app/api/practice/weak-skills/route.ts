import { NextResponse } from 'next/server'
import { RoadmapNodeType } from '@prisma/client'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const progress = await prisma.nodeProgress.findMany({
      where: {
        userId: authentication.appUser.id,
        completedAt: { not: null },
        bestScore: { not: null, lt: 80 },
        node: {
          type: { in: [RoadmapNodeType.QUIZ, RoadmapNodeType.BOSS] },
          isPublished: true,
          chapter: { isPublished: true },
          OR: [{ submoduleId: null }, { submodule: { isPublished: true } }],
        },
      },
      orderBy: [{ bestScore: 'asc' }, { completedAt: 'desc' }],
      select: {
        bestScore: true,
        node: {
          select: {
            id: true,
            title: true,
            chapterId: true,
            chapter: { select: { title: true } },
            submodule: { select: { title: true } },
          },
        },
      },
    })

    const areas = progress.flatMap((item) => item.bestScore === null
      ? []
      : [{
          nodeId: item.node.id,
          chapterId: item.node.chapterId,
          nodeTitle: item.node.title,
          chapterTitle: item.node.chapter.title,
          submoduleTitle: item.node.submodule?.title ?? null,
          score: item.bestScore,
        }])

    return NextResponse.json({ areas }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load weak quiz topics.', error)
    return NextResponse.json({ error: 'Could not load your weak quiz topics.' }, { status: 500 })
  }
}
