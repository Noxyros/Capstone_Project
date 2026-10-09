'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient, isSupabaseBrowserConfigured } from '@/src/lib/supabase/client'

type AppRole = 'STUDENT' | 'TEACHER' | 'ADMIN'
type AuthState = 'loading' | 'signed_out' | 'signed_in' | 'configuration_error' | 'profile_error'

interface AuthContextValue {
  user: SupabaseUser | null
  role: AppRole | null
  state: AuthState
  error: string
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [role, setRole] = useState<AppRole | null>(null)
  const [state, setState] = useState<AuthState>('loading')
  const [error, setError] = useState('')

  const loadProfile = useCallback(async () => {
    const response = await fetch('/api/auth/profile', { cache: 'no-store' })
    const result: unknown = await response.json()
    if (!response.ok) {
      const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Could not load your account profile.'
      throw new Error(message)
    }
    if (
      typeof result !== 'object'
      || result === null
      || !('role' in result)
      || (result.role !== 'STUDENT' && result.role !== 'TEACHER' && result.role !== 'ADMIN')
    ) {
      throw new Error('The server returned an invalid account profile.')
    }

    setRole(result.role)
    setState('signed_in')
    setError('')
  }, [])

  const syncSession = useCallback(async (nextUser: SupabaseUser | null) => {
    setUser(nextUser)
    setRole(null)
    if (!nextUser) {
      setState('signed_out')
      setError('')
      return
    }

    setState('loading')
    try {
      await loadProfile()
    } catch (profileError) {
      console.error('Failed to synchronize the signed-in account profile.', profileError)
      setState('profile_error')
      setError(profileError instanceof Error ? profileError.message : 'Could not load your account profile.')
    }
  }, [loadProfile])

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setState('configuration_error')
      setError('Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the app.')
      return
    }

    const supabase = createClient()
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void syncSession(session?.user ?? null)
    })

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        console.error('Failed to restore the Supabase auth session.', sessionError)
        setState('profile_error')
        setError('Could not restore your session. Please sign in again.')
        return
      }
      void syncSession(data.session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [syncSession])

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
    setRole(null)
    setState('signed_out')
    setError('')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    setState('loading')
    try {
      await loadProfile()
    } catch (profileError) {
      console.error('Failed to refresh the signed-in account profile.', profileError)
      setState('profile_error')
      setError(profileError instanceof Error ? profileError.message : 'Could not load your account profile.')
    }
  }, [loadProfile, user])

  return (
    <AuthContext.Provider value={{ user, role, state, error, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
