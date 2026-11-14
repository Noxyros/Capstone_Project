import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { subjectId } = await params

  try {
    const chapters = await prisma.chapter.findMany({
      where: {
        subjectId,
        isPublished: true,
        subject: { isPublished: true },
        nodes: {
          some: {
            isPublished: true,
            OR: [
              { submoduleId: null },
              {
                submodule: {
                  isPublished: true,
                  chapter: { isPublished: true, subject: { isPublished: true } },
                },
              },
            ],
            questions: { some: {} },
          },
        },
      },
      include: {
        nodes: {
          where: {
            isPublished: true,
            OR: [
              { submoduleId: null },
              {
                submodule: {
                  isPublished: true,
                  chapter: { isPublished: true, subject: { isPublished: true } },
                },
              },
            ],
            questions: { some: {} },
          },
          select: {
            id: true,
            title: true,
            order: true,
            type: true,
            questions: { select: { id: true } },
            submodule: { select: { id: true, title: true, order: true } },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    })

    const chaptersWithCounts = chapters.map((chapter) => {
      const questionCount = chapter.nodes.reduce(
        (sum, node) => sum + node.questions.length,
        0,
      )
      return {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        questionCount,
        nodes: chapter.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          order: node.order,
          type: node.type,
          questionCount: node.questions.length,
          submodule: node.submodule,
        })),
      }
    })

    return NextResponse.json({ chapters: chaptersWithCounts }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load bank chapters.', error)
    return NextResponse.json({ error: 'Could not load chapters.' }, { status: 500 })
  }
}
