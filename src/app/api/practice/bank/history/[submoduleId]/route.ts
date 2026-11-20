import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submoduleId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { submoduleId } = await params
  try {
    const attempts = await prisma.$queryRaw<{ result: unknown }[]>`
      SELECT "result"
      FROM "PracticeBankAttempt"
      WHERE "userId" = ${authentication.appUser.id}
        AND "submoduleId" = ${submoduleId}
        AND "completedAt" IS NOT NULL
        AND "result" IS NOT NULL
      ORDER BY "completedAt" DESC, "createdAt" DESC
      LIMIT 10
    `
    return NextResponse.json({ attempts: attempts.map(({ result }) => result) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Failed to load synchronized Question Bank history.', error)
    return NextResponse.json({ error: 'Could not load attempt history.' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ submoduleId: string }> },
) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const { submoduleId } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (
    typeof body !== 'object'
    || body === null
    || !('attemptId' in body)
    || (body.attemptId !== null && typeof body.attemptId !== 'string')
  ) {
    return NextResponse.json({ error: 'Attempt history action is invalid.' }, { status: 400 })
  }

  try {
    const result = await prisma.practiceBankAttempt.deleteMany({
      where: {
        userId: authentication.appUser.id,
        submoduleId,
        completedAt: { not: null },
        ...(body.attemptId ? { id: body.attemptId } : {}),
      },
    })
    return NextResponse.json({ deletedCount: result.count }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Failed to update synchronized Question Bank history.', error)
    return NextResponse.json({ error: 'Could not update attempt history.' }, { status: 500 })
  }
}
