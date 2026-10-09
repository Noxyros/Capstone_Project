import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { createClient } from '@/src/lib/supabase/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { isAllowedAvatarUrl } from '@/src/lib/profileAvatars'
import { getAppProfile } from '@/src/lib/gameEconomy'

async function chooseUsername(suggested: string): Promise<string> {
  const base = suggested
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 18) || 'student'

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 7)
    const candidate = `${base}_${suffix}`.slice(0, 24)
    const existing = await prisma.user.findUnique({
      where: { handle: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
  }
  throw new Error('Could not allocate a unique username.')
}

export async function GET() {
  let supabaseUser
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      return NextResponse.json({ error: 'Sign in to load your account profile.' }, { status: 401 })
    }
    supabaseUser = data.user
  } catch (error) {
    console.error('Unable to verify the Supabase session for profile sync.', error)
    return NextResponse.json({ error: 'Account authentication is not configured correctly.' }, { status: 500 })
  }

  const email = supabaseUser.email?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Your authenticated account does not have an email address.' }, { status: 400 })
  }
  if (!supabaseUser.email_confirmed_at) {
    return NextResponse.json({ error: 'Confirm your email before creating an app profile.' }, { status: 403 })
  }

  try {
    const metadataHandle = supabaseUser.user_metadata?.handle
    const requestedHandle = typeof metadataHandle === 'string'
      ? metadataHandle.trim().toLowerCase()
      : ''
    if (requestedHandle && !/^[a-z0-9_]{3,24}$/.test(requestedHandle)) {
      return NextResponse.json({ error: 'Your username is invalid. Sign out and contact support.' }, { status: 400 })
    }

    const profileByAuthId = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
      select: { id: true, email: true, handle: true },
    })
    if (profileByAuthId) {
      if (profileByAuthId.email !== email || !profileByAuthId.handle) {
        const handle = profileByAuthId.handle
          ?? (requestedHandle || await chooseUsername(email.split('@')[0] ?? 'student'))
        await prisma.user.update({
          where: { id: profileByAuthId.id },
          data: { email, ...(!profileByAuthId.handle ? { handle } : {}) },
        })
      }
      return NextResponse.json(await getAppProfile(profileByAuthId.id))
    }

    const existingEmailProfile = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingEmailProfile) {
      return NextResponse.json({ error: 'An app profile already exists for this email and requires administrator linking.' }, { status: 409 })
    }

    const handle = requestedHandle || await chooseUsername(email.split('@')[0] ?? 'student')
    const displayName = supabaseUser.user_metadata?.full_name
    const profile = await prisma.user.create({
      data: {
        supabaseAuthId: supabaseUser.id,
        email,
        handle,
        name: typeof displayName === 'string' ? displayName : null,
        role: Role.STUDENT,
      },
      select: { id: true },
    })

    return NextResponse.json(await getAppProfile(profile.id))
  } catch (error) {
    console.error('Failed to create or update the app user profile.', error)
    return NextResponse.json({ error: 'Could not save your app profile. Please try again.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Profile data is invalid.' }, { status: 400 })
  }

  if (!('name' in body) || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) {
    return NextResponse.json({ error: 'Display name must be between 1 and 80 characters.' }, { status: 400 })
  }
  if (!('handle' in body) || typeof body.handle !== 'string') {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 })
  }
  const handle = body.handle.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    return NextResponse.json({ error: 'Username must use 3–24 lowercase letters, numbers, or underscores.' }, { status: 400 })
  }
  if (!('avatarUrl' in body) || (body.avatarUrl !== null && typeof body.avatarUrl !== 'string')) {
    return NextResponse.json({ error: 'Avatar selection is invalid.' }, { status: 400 })
  }
  if (typeof body.avatarUrl === 'string' && !isAllowedAvatarUrl(body.avatarUrl, authentication.appUser.id)) {
    return NextResponse.json({ error: 'Choose a Questly preset or upload an avatar that passes moderation.' }, { status: 400 })
  }

  try {
    const profile = await prisma.user.update({
      where: { id: authentication.appUser.id },
      data: {
        name: body.name.trim(),
        handle,
        avatarUrl: body.avatarUrl,
      },
      select: { id: true },
    })
    return NextResponse.json(await getAppProfile(profile.id))
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 })
    }
    console.error('Failed to save the user profile.', error)
    return NextResponse.json({ error: 'Could not save your profile. Please try again.' }, { status: 500 })
  }
}
