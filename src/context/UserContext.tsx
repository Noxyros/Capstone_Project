'use client'

import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useAuth } from '@/src/context/AuthContext'
import { isAppProfile, isGameStatePatch, type AppProfile } from '@/src/lib/appProfile'

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
  doubleGemsUntil: string | null
  doubleGemsPausedAt: string | null
  activityDates: string[]
  isMutating: boolean
  isSuperModeSaving: boolean
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
  const [isSuperModeSaving, setIsSuperModeSaving] = useState(false)
  const [gameError, setGameError] = useState('')
  const actionInFlightRef = useRef(false)

  const runAction = useCallback(async (
    action: string,
    values: Record<string, unknown> = {},
    optimisticUpdate?: (profile: AppProfile) => AppProfile,
  ) => {
    if (actionInFlightRef.current) return false
    actionInFlightRef.current = true
    setGameError('')
    setIsMutating(true)
    const previousProfile = profile
    if (previousProfile && optimisticUpdate) {
      updateProfile(optimisticUpdate(previousProfile), { invalidateLeaderboard: false })
    }
    try {
      const response = await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...values }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(responseError(result, 'Could not update your learner account.'))
      if (!isGameStatePatch(result)) throw new Error('The server returned invalid learner account data.')
      if (previousProfile && optimisticUpdate) {
        updateProfile({ ...previousProfile, ...result }, { invalidateLeaderboard: false })
      } else if (isAppProfile(result)) {
        updateProfile(result)
      }
      return true
    } catch (error) {
      setGameError(error instanceof Error ? error.message : 'Could not update your learner account.')
      if (previousProfile && optimisticUpdate) {
        updateProfile(previousProfile, { invalidateLeaderboard: false })
      }
      return false
    } finally {
      actionInFlightRef.current = false
      setIsMutating(false)
    }
  }, [profile, updateProfile])

  const buyPowerUp = useCallback((code: PowerUpCode) => {
    const prices: Record<PowerUpCode, number> = {
      HEART_REFILL: 250,
      DOUBLE_XP: 100,
      STREAK_FREEZE: 200,
    }
    const price = prices[code]
    return runAction('purchase', { code }, (currentProfile) => {
      const now = Date.now()
      const canPurchase = currentProfile.gems >= price
        && (code !== 'HEART_REFILL' || currentProfile.hearts < currentProfile.maxHearts)
        && (code !== 'DOUBLE_XP' || !currentProfile.doubleXpUntil || Date.parse(currentProfile.doubleXpUntil) <= now)
        && (code !== 'STREAK_FREEZE' || currentProfile.streakFreezeCount < 2)
      if (!canPurchase) return currentProfile

      return {
        ...currentProfile,
        gems: currentProfile.gems - price,
        ...(code === 'HEART_REFILL' ? { hearts: currentProfile.maxHearts } : {}),
        ...(code === 'DOUBLE_XP' ? { doubleXpUntil: new Date(now + 15 * 60_000).toISOString() } : {}),
        ...(code === 'STREAK_FREEZE' ? { streakFreezeCount: currentProfile.streakFreezeCount + 1 } : {}),
      }
    })
  }, [runAction])
  const setSuperMode = useCallback(async (enabled: boolean) => {
    if (isSuperModeSaving || actionInFlightRef.current) return false
    actionInFlightRef.current = true
    const previousProfile = profile
    const now = Date.now()
    const wasGemBoostActive = Boolean(previousProfile?.doubleGemsUntil)
      && (Boolean(previousProfile?.doubleGemsPausedAt)
        || Date.parse(previousProfile?.doubleGemsUntil ?? '') > now)
    const optimisticGemsUntil = !enabled && previousProfile?.doubleGemsUntil && previousProfile.doubleGemsPausedAt
      ? new Date(Date.parse(previousProfile.doubleGemsUntil) + now - Date.parse(previousProfile.doubleGemsPausedAt)).toISOString()
      : previousProfile?.doubleGemsUntil ?? null
    if (previousProfile) {
      updateProfile({
        ...previousProfile,
        superMode: enabled,
        doubleGemsUntil: wasGemBoostActive ? optimisticGemsUntil : null,
        doubleGemsPausedAt: enabled && wasGemBoostActive
          ? previousProfile.doubleGemsPausedAt ?? new Date(now).toISOString()
          : null,
      }, { invalidateLeaderboard: false })
    }
    setGameError('')
    setIsSuperModeSaving(true)
    try {
      const response = await fetch('/api/game-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_super_mode', enabled }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(responseError(result, 'Could not update your learner account.'))
      if (
        typeof result !== 'object'
        || result === null
        || !('superMode' in result)
        || typeof result.superMode !== 'boolean'
        || result.superMode !== enabled
        || !('doubleGemsUntil' in result)
        || (typeof result.doubleGemsUntil !== 'string' && result.doubleGemsUntil !== null)
        || !('doubleGemsPausedAt' in result)
        || (typeof result.doubleGemsPausedAt !== 'string' && result.doubleGemsPausedAt !== null)
      ) {
        throw new Error('The server returned an invalid Super Mode state.')
      }
      if (previousProfile) {
        updateProfile({
          ...previousProfile,
          superMode: result.superMode,
          doubleGemsUntil: result.doubleGemsUntil,
          doubleGemsPausedAt: result.doubleGemsPausedAt,
        }, { invalidateLeaderboard: false })
      }
      return true
    } catch (error) {
      setGameError(error instanceof Error ? error.message : 'Could not update your learner account.')
      if (previousProfile) updateProfile(previousProfile, { invalidateLeaderboard: false })
      return false
    } finally {
      actionInFlightRef.current = false
      setIsSuperModeSaving(false)
    }
  }, [isSuperModeSaving, profile, updateProfile])
  const activateHeartSurge = useCallback(() => runAction('activate_heart_surge', {}, (currentProfile) => {
    const now = Date.now()
    const gemBoostActive = Boolean(currentProfile.doubleGemsPausedAt)
      || Boolean(currentProfile.doubleGemsUntil && Date.parse(currentProfile.doubleGemsUntil) > now)
    if (currentProfile.superMode || currentProfile.hearts <= 4 || gemBoostActive) return currentProfile
    return {
      ...currentProfile,
      hearts: currentProfile.hearts - 4,
      doubleGemsUntil: new Date(now + 7 * 60_000).toISOString(),
      doubleGemsPausedAt: null,
    }
  }), [runAction])

  return (
    <UserContext.Provider value={{
      gems: profile?.gems ?? 0,
      hearts: profile?.hearts ?? 0,
      maxHearts: profile?.maxHearts ?? 5,
      superMode: profile?.superMode ?? false,
      unlimitedHearts: profile?.superMode ?? false,
      streak: profile?.streak ?? 0,
      freezesEquipped: profile?.streakFreezeCount ?? 0,
      weeklyXp: profile?.weeklyXp ?? 0,
      doubleXpUntil: profile?.doubleXpUntil ?? null,
      doubleGemsUntil: profile?.doubleGemsUntil ?? null,
      doubleGemsPausedAt: profile?.doubleGemsPausedAt ?? null,
      activityDates: profile?.activityDates ?? [],
      isMutating,
      isSuperModeSaving,
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
