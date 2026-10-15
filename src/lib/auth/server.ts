import { prisma } from '@/src/lib/prisma'
import { createClient } from '@/src/lib/supabase/server'

export type AppUser = {
  id: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
}

export type AuthenticationResult =
  | { appUser: AppUser; error?: never; status?: never }
  | { appUser?: never; error: string; status: number }

export type AuthenticationTimings = {
  tokenVerificationMs: number
  appUserLookupMs: number
}

export async function authenticateAppUser(
  onTiming?: (timings: AuthenticationTimings) => void,
): Promise<AuthenticationResult> {
  const timings: AuthenticationTimings = { tokenVerificationMs: 0, appUserLookupMs: 0 }
  try {
    const supabase = await createClient()
    const verificationStartedAt = performance.now()
    const { data, error } = await supabase.auth.getClaims()
    timings.tokenVerificationMs = Math.round(performance.now() - verificationStartedAt)
    if (error || !data?.claims || typeof data.claims.sub !== 'string' || !data.claims.sub) {
      onTiming?.(timings)
      return { error: 'Sign in to continue.', status: 401 }
    }

    const lookupStartedAt = performance.now()
    const appUser = await prisma.user.findUnique({
      where: { supabaseAuthId: data.claims.sub },
      select: { id: true, role: true },
    })
    timings.appUserLookupMs = Math.round(performance.now() - lookupStartedAt)
    onTiming?.(timings)
    if (!appUser) return { error: 'Your account profile is not ready. Refresh and try again.', status: 403 }

    return { appUser }
  } catch (error) {
    onTiming?.(timings)
    console.error('Failed to authenticate the app user.', error)
    return { error: 'Account authentication is temporarily unavailable.', status: 500 }
  }
}
