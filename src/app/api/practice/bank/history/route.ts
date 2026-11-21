import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const chapterId = new URL(request.url).searchParams.get('chapterId')
  if (!chapterId) {
    return NextResponse.json({ error: 'Chapter ID is required.' }, { status: 400 })
  }

  try {
    const attempts = await prisma.$queryRaw<{ submoduleId: string }[]>`
      SELECT DISTINCT attempt."submoduleId"
      FROM "PracticeBankAttempt" AS attempt
      JOIN "Submodule" AS submodule ON submodule."id" = attempt."submoduleId"
      WHERE attempt."userId" = ${authentication.appUser.id}
        AND submodule."chapterId" = ${chapterId}
        AND attempt."completedAt" IS NOT NULL
        AND attempt."result" IS NOT NULL
    `
    return NextResponse.json({
      completedSubmoduleIds: attempts.map(({ submoduleId }) => submoduleId),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load completed Question Bank submodules.', error)
    return NextResponse.json({ error: 'Could not load Question Bank history.' }, { status: 500 })
  }
}
