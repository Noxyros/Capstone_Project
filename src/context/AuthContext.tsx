'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient, isSupabaseBrowserConfigured } from '@/src/lib/supabase/client'
import { isAppProfile, type AppProfile, type AppRole } from '@/src/lib/appProfile'
import { invalidateCurriculumCache } from '@/src/lib/curriculumClient'
import { invalidateLeaderboardCache, markLeaderboardCacheStale } from '@/src/lib/leaderboardClient'

type AuthState = 'loading' | 'signed_out' | 'signed_in' | 'configuration_error' | 'profile_error'

interface AuthContextValue {
  user: SupabaseUser | null
  profile: AppProfile | null
  role: AppRole | null
  state: AuthState
  error: string
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (profile: AppProfile, options?: { invalidateLeaderboard?: boolean }) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const PROFILE_CACHE_PREFIX = 'questly_profile:'

function readCachedProfile(authUserId: string): AppProfile | null {
  try {
    const cached = sessionStorage.getItem(`${PROFILE_CACHE_PREFIX}${authUserId}`)
    if (!cached) return null
    const value: unknown = JSON.parse(cached)
    if (
      typeof value !== 'object'
      || value === null
      || !('profile' in value)
      || !isAppProfile(value.profile)
      || !('expiresAt' in value)
      || typeof value.expiresAt !== 'number'
      || value.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${authUserId}`)
      return null
    }
    return value.profile
  } catch (error) {
    console.warn('Could not restore the cached learner profile.', error)
    return null
  }
}

function writeCachedProfile(authUserId: string, profile: AppProfile): void {
  try {
    sessionStorage.setItem(`${PROFILE_CACHE_PREFIX}${authUserId}`, JSON.stringify({
      profile,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    }))
  } catch (error) {
    console.warn('Could not cache the learner profile for this browser tab.', error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<AppProfile | null>(null)
  const [role, setRole] = useState<AppRole | null>(null)
  const [state, setState] = useState<AuthState>('loading')
  const [error, setError] = useState('')

  const loadProfile = useCallback(async (authUserId: string) => {
    const response = await fetch('/api/auth/profile', { cache: 'no-store' })
    const result: unknown = await response.json()
    if (!response.ok) {
      const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Could not load your account profile.'
      throw new Error(message)
    }
    if (!isAppProfile(result)) {
      throw new Error('The server returned an invalid account profile.')
    }

    setProfile(result)
    setRole(result.role)
    setState('signed_in')
    setError('')
    writeCachedProfile(authUserId, result)
  }, [])

  const syncSession = useCallback(async (nextUser: SupabaseUser | null, forceProfileReload = false) => {
    const changedUser = user?.id !== nextUser?.id
    if (changedUser && user?.id) {
      invalidateCurriculumCache(user.id)
      invalidateLeaderboardCache(user.id)
    }
    setUser(nextUser)
    if (!nextUser) {
      setProfile(null)
      setRole(null)
      setState('signed_out')
      setError('')
      return
    }

    if (!forceProfileReload && user?.id === nextUser.id && profile) {
      setState('signed_in')
      return
    }

    let hasCachedProfile = false
    if (changedUser && !forceProfileReload) {
      const cachedProfile = readCachedProfile(nextUser.id)
      if (cachedProfile) {
        setProfile(cachedProfile)
        setRole(cachedProfile.role)
        setState('signed_in')
        setError('')
        hasCachedProfile = true
      }
    }

    if (changedUser && !hasCachedProfile) {
      setProfile(null)
      setRole(null)
    }
    if (!hasCachedProfile) setState('loading')
    try {
      await loadProfile(nextUser.id)
    } catch (profileError) {
      console.error('Failed to synchronize the signed-in account profile.', profileError)
      if (!hasCachedProfile) {
        setState('profile_error')
        setError(profileError instanceof Error ? profileError.message : 'Could not load your account profile.')
      }
    }
  }, [loadProfile, profile, user])

  const syncSessionRef = useRef(syncSession)
  syncSessionRef.current = syncSession

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setState('configuration_error')
      setError('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the app.')
      return
    }

    const supabase = createClient()
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') {
        void syncSessionRef.current(session?.user ?? null, event === 'USER_UPDATED')
      }
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        console.error('Failed to restore the Supabase auth session.', sessionError)
        setState('profile_error')
        setError('Could not restore your session. Please sign in again.')
        return
      }
      void syncSessionRef.current(data.session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!isSupabaseBrowserConfigured()) {
      throw new Error('Supabase browser auth is not configured.')
    }

    const { error: signOutError } = await createClient().auth.signOut()
    if (signOutError) {
      console.error('Supabase sign-out failed.', signOutError)
      throw new Error('Could not sign out. Please try again.')
    }
    setUser(null)
    if (user) {
      invalidateCurriculumCache(user.id)
      invalidateLeaderboardCache(user.id)
    }
    if (user) {
      try {
        sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${user.id}`)
      } catch (error) {
        console.warn('Could not clear the cached learner profile for this browser tab.', error)
      }
    }
    setProfile(null)
    setRole(null)
    setState('signed_out')
    setError('')
  }, [user])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    setState('loading')
    try {
      await loadProfile(user.id)
    } catch (profileError) {
      console.error('Failed to refresh the signed-in account profile.', profileError)
      setState('profile_error')
      setError(profileError instanceof Error ? profileError.message : 'Could not load your account profile.')
    }
  }, [loadProfile, user])

  const updateProfile = useCallback((
    nextProfile: AppProfile,
    { invalidateLeaderboard = true }: { invalidateLeaderboard?: boolean } = {},
  ) => {
    setProfile(nextProfile)
    setRole(nextProfile.role)
    setState('signed_in')
    setError('')
    if (user) {
      writeCachedProfile(user.id, nextProfile)
      if (invalidateLeaderboard) markLeaderboardCacheStale(user.id)
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, profile, role, state, error, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
