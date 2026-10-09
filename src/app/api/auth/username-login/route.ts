import { NextResponse } from 'next/server'
import { prisma } from '@/src/lib/prisma'

const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/

type SupabaseTokenResponse = {
  access_token: string
  refresh_token: string
}

function isTokenResponse(value: unknown): value is SupabaseTokenResponse {
  return typeof value === 'object'
    && value !== null
    && 'access_token' in value
    && typeof value.access_token === 'string'
    && 'refresh_token' in value
    && typeof value.refresh_token === 'string'
}

export async function POST(request: Request) {
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
    || !('password' in body)
    || typeof body.password !== 'string'
    || body.password.length < 8
    || body.password.length > 72
  ) {
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 })
  }

  try {
    const profile = await prisma.user.findFirst({
      where: {
        handle: body.username.trim().toLowerCase(),
        supabaseAuthId: { not: null },
      },
      select: { email: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 })
    }

    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
      },
      body: JSON.stringify({ email: profile.email, password: body.password }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })

    if (response.status === 400 || response.status === 401) {
      return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 })
    }
    if (response.status === 429) {
      return NextResponse.json({ error: 'Too many sign-in attempts. Please wait and try again.' }, { status: 429 })
    }
    if (!response.ok) {
      console.error('Supabase username sign-in returned an unexpected status.', response.status)
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, { status: 502 })
    }

    const result: unknown = await response.json()
    if (!isTokenResponse(result)) {
      console.error('Supabase username sign-in returned an invalid token response.')
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, { status: 502 })
    }

    return NextResponse.json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Username sign-in failed.', error)
    return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again.' }, { status: 502 })
  }
}
