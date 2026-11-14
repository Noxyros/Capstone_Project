import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  try {
    const subjects = await prisma.subject.findMany({
      where: {
        isPublished: true,
        chapters: {
          some: {
            isPublished: true,
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
        },
      },
      include: {
        grade: { select: { id: true, name: true, level: true } },
        chapters: {
          where: { isPublished: true },
          select: {
            id: true,
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
              select: { id: true, questions: { select: { id: true } } },
            },
          },
        },
      },
      orderBy: [{ grade: { level: 'asc' } }, { name: 'asc' }],
    })

    const subjectsWithCounts = subjects.map((subject) => {
      const questionCount = subject.chapters.reduce(
        (sum, chapter) => sum + chapter.nodes.reduce((nSum, node) => nSum + node.questions.length, 0),
        0,
      )
      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color,
        grade: subject.grade,
        questionCount,
      }
    })

    return NextResponse.json({ subjects: subjectsWithCounts }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load bank subjects.', error)
    return NextResponse.json({ error: 'Could not load subjects.' }, { status: 500 })
  }
}
