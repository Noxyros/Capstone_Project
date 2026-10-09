import { prisma } from '@/src/lib/prisma'
import { createClient } from '@/src/lib/supabase/server'

export type AppUser = {
  id: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
}

export type AuthenticationResult =
  | { appUser: AppUser; error?: never; status?: never }
  | { appUser?: never; error: string; status: number }

export async function authenticateAppUser(): Promise<AuthenticationResult> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return { error: 'Sign in to continue.', status: 401 }

    const appUser = await prisma.user.findUnique({
      where: { supabaseAuthId: data.user.id },
      select: { id: true, role: true },
    })
    if (!appUser) return { error: 'Your account profile is not ready. Refresh and try again.', status: 403 }

    return { appUser }
  } catch (error) {
    console.error('Failed to authenticate the app user.', error)
    return { error: 'Account authentication is temporarily unavailable.', status: 500 }
  }
}
