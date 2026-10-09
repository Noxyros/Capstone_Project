import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 30
const WINDOW_MS = 60_000
const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/

function consumeRateLimit(request: Request): boolean {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const address = request.headers.get('x-real-ip') ?? forwardedFor?.split(',')[0]?.trim() ?? 'unknown'
  const now = Date.now()
  const bucket = attempts.get(address)
  if (!bucket || bucket.resetAt <= now) {
    attempts.set(address, { count: 1, resetAt: now + WINDOW_MS })
    if (attempts.size > 2_000) {
      for (const [key, value] of attempts) {
        if (value.resetAt <= now) attempts.delete(key)
      }
    }
    return true
  }
  if (bucket.count >= MAX_ATTEMPTS) return false
  bucket.count += 1
  return true
}

export async function POST(request: Request) {
  if (!consumeRateLimit(request)) {
    return NextResponse.json({ error: 'Too many username checks. Please wait a minute and try again.' }, { status: 429 })
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
    || !('username' in body)
    || typeof body.username !== 'string'
    || !USERNAME_PATTERN.test(body.username.trim().toLowerCase())
  ) {
    return NextResponse.json({ error: 'Use 3–24 characters: lowercase letters, numbers, and underscores.' }, { status: 400 })
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { handle: body.username.trim().toLowerCase() },
      select: { id: true },
    })
    return NextResponse.json({ available: !existing })
  } catch (error) {
    console.error('Failed to check username availability.', error)
    return NextResponse.json({ error: 'Could not check this username. Please try again.' }, { status: 500 })
  }
}
