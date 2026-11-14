import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { subjectId, chapterId } = await params

  try {
    const submodules = await prisma.submodule.findMany({
      where: {
        chapterId,
        isPublished: true,
        chapter: {
          subjectId,
          isPublished: true,
          subject: { isPublished: true },
        },
        nodes: {
          some: {
            isPublished: true,
            chapter: { isPublished: true, subject: { isPublished: true } },
            questions: { some: {} },
          },
        },
      },
      include: {
        nodes: {
          where: {
            isPublished: true,
            chapter: { isPublished: true, subject: { isPublished: true } },
            questions: { some: {} },
          },
          select: {
            id: true,
            title: true,
            order: true,
            type: true,
            questions: { select: { id: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })

    const submodulesWithCounts = submodules.map((submodule) => {
      const questionCount = submodule.nodes.reduce(
        (sum, node) => sum + node.questions.length,
        0,
      )
      return {
        id: submodule.id,
        title: submodule.title,
        order: submodule.order,
        questionCount,
        nodes: submodule.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          order: node.order,
          type: node.type,
          questionCount: node.questions.length,
        })),
      }
    })

    return NextResponse.json({ submodules: submodulesWithCounts }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load bank submodules.', error)
    return NextResponse.json({ error: 'Could not load submodules.' }, { status: 500 })
  }
}
