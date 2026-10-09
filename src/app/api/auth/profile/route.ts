import { NextResponse } from 'next/server'
import { Role } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { createClient } from '@/src/lib/supabase/server'

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
    const profileByAuthId = await prisma.user.findUnique({
      where: { supabaseAuthId: supabaseUser.id },
      select: { id: true, email: true, name: true, role: true },
    })
    if (profileByAuthId) {
      const profile = profileByAuthId.email === email
        ? profileByAuthId
        : await prisma.user.update({
          where: { id: profileByAuthId.id },
          data: { email },
          select: { id: true, email: true, name: true, role: true },
        })
      return NextResponse.json(profile)
    }

    const existingEmailProfile = await prisma.user.findUnique({
      where: { email },
      select: { id: true, supabaseAuthId: true, name: true, role: true },
    })
    if (existingEmailProfile?.supabaseAuthId && existingEmailProfile.supabaseAuthId !== supabaseUser.id) {
      return NextResponse.json({ error: 'This email is already linked to another account. Contact support.' }, { status: 409 })
    }

    const displayName = supabaseUser.user_metadata?.full_name
    const profile = existingEmailProfile
      ? await prisma.user.update({
        where: { id: existingEmailProfile.id },
        data: {
          supabaseAuthId: supabaseUser.id,
          ...(typeof displayName === 'string' && !existingEmailProfile.name ? { name: displayName } : {}),
        },
        select: { id: true, email: true, name: true, role: true },
      })
      : await prisma.user.create({
        data: {
          supabaseAuthId: supabaseUser.id,
          email,
          name: typeof displayName === 'string' ? displayName : null,
          role: Role.STUDENT,
        },
        select: { id: true, email: true, name: true, role: true },
      })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Failed to create or update the app user profile.', error)
    return NextResponse.json({ error: 'Could not save your app profile. Please try again.' }, { status: 500 })
  }
}
