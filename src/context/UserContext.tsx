'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { isAppProfile } from '@/src/lib/appProfile'

export type PowerUpCode = 'HEART_REFILL' | 'DOUBLE_XP' | 'STREAK_FREEZE'

interface UserContextType {
  gems: number
  hearts: number
  maxHearts: number
  superMode: boolean
  unlimitedHearts: boolean
  streak: number
  freezesEquipped: number
  weeklyXp: number
  doubleXpUntil: string | null
  activityDates: string[]
  isMutating: boolean
  isSuperModePending: boolean
  gameError: string
  buyPowerUp: (code: PowerUpCode) => Promise<boolean>
  setSuperMode: (enabled: boolean) => Promise<boolean>
  activateHeartSurge: () => Promise<boolean>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function responseError(result: unknown, fallback: string): string {
  return typeof result === 'object'
    && result !== null
    && 'error' in result
    && typeof result.error === 'string'
    ? result.error
    : fallback
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = useAuth()
  const [isMutating, setIsMutating] = useState(false)
  const [superModeOverride, setSuperModeOverride] = useState<boolean | null>(null)
  const [isSuperModePending, setIsSuperModePending] = useState(false)
  const [gameError, setGameError] = useState('')

  const runAction = useCallback(async (action: string, values: Record<string, unknown> = {}) => {
    setGameError('')
    setIsMutating(true)
    try {
      const response = await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...values }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(responseError(result, 'Could not update your learner account.'))
      if (!isAppProfile(result)) throw new Error('The server returned invalid learner account data.')
      updateProfile(result)
      return true
    } catch (error) {
      setGameError(error instanceof Error ? error.message : 'Could not update your learner account.')
      return false
    } finally {
      setIsMutating(false)
    }
  }, [updateProfile])

  const buyPowerUp = useCallback((code: PowerUpCode) => runAction('purchase', { code }), [runAction])
  const setSuperMode = useCallback(async (enabled: boolean) => {
    if (isSuperModePending) return false
    setSuperModeOverride(enabled)
    setIsSuperModePending(true)
    setGameError('')
    try {
      const response = await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_super_mode', enabled }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(responseError(result, 'Could not update Super Mode.'))
      if (
        typeof result !== 'object'
        || result === null
        || !('superMode' in result)
        || typeof result.superMode !== 'boolean'
        || result.superMode !== enabled
      ) {
        throw new Error('The server returned an invalid Super Mode state.')
      }
      if (profile) {
        updateProfile({ ...profile, superMode: enabled }, { invalidateLeaderboard: false })
      }
      setSuperModeOverride(null)
      return true
    } catch (error) {
      console.error('Failed to update Super Mode.', error)
      setGameError(error instanceof Error ? error.message : 'Could not update Super Mode.')
      setSuperModeOverride(null)
      return false
    } finally {
      setIsSuperModePending(false)
    }
  }, [isSuperModePending, profile, updateProfile])
  const activateHeartSurge = useCallback(() => runAction('activate_heart_surge'), [runAction])
  const superMode = superModeOverride ?? profile?.superMode ?? false

  return (
    <UserContext.Provider value={{
      gems: profile?.gems ?? 0,
      hearts: profile?.hearts ?? 0,
      maxHearts: profile?.maxHearts ?? 5,
      superMode,
      unlimitedHearts: superMode,
      streak: profile?.streak ?? 0,
      freezesEquipped: profile?.streakFreezeCount ?? 0,
      weeklyXp: profile?.weeklyXp ?? 0,
      doubleXpUntil: profile?.doubleXpUntil ?? null,
      activityDates: profile?.activityDates ?? [],
      isMutating,
      isSuperModePending,
      gameError,
      buyPowerUp,
      setSuperMode,
      activateHeartSurge,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used within a UserProvider')
  return context
}
