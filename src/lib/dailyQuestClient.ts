import { isDailyQuestProgress, jakartaDateKey, type DailyQuestProgress } from '@/src/lib/dailyQuests'

const CACHE_PREFIX = 'questly_daily_quests:v3:'
const CACHE_TTL_MS = 10 * 60 * 1000
const memoryCache = new Map<string, { date: string; expiresAt: number; quests: DailyQuestProgress[] }>()

export function getCachedDailyQuests(userId: string): {
  quests: DailyQuestProgress[]
  isFresh: boolean
} | null {
  if (!userId || typeof window === 'undefined') return null
  const key = `${CACHE_PREFIX}${userId}`
  const date = jakartaDateKey()
  let cached = memoryCache.get(key)

  if (!cached) {
    try {
      const snapshot = sessionStorage.getItem(key)
      if (!snapshot) return null
      const parsed: unknown = JSON.parse(snapshot)
      if (
        typeof parsed !== 'object'
        || parsed === null
        || !('date' in parsed)
        || parsed.date !== date
        || !('expiresAt' in parsed)
        || typeof parsed.expiresAt !== 'number'
        || !('quests' in parsed)
        || !Array.isArray(parsed.quests)
        || !parsed.quests.every(isDailyQuestProgress)
      ) {
        if (typeof parsed === 'object' && parsed !== null && 'date' in parsed && parsed.date !== date) {
          sessionStorage.removeItem(key)
        }
        return null
      }
      cached = { date, expiresAt: parsed.expiresAt, quests: parsed.quests }
      memoryCache.set(key, cached)
    } catch (error) {
      console.warn('Could not restore daily quests from this browser tab.', error)
      return null
    }
  }

  if (cached.date !== date) {
    memoryCache.delete(key)
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn('Could not remove expired daily quests from this browser tab.', error)
    }
    return null
  }

  return { quests: cached.quests, isFresh: cached.expiresAt > Date.now() }
}

export function cacheDailyQuests(userId: string, quests: DailyQuestProgress[]): void {
  if (!userId || typeof window === 'undefined') return
  const key = `${CACHE_PREFIX}${userId}`
  const snapshot = {
    date: jakartaDateKey(),
    expiresAt: Date.now() + CACHE_TTL_MS,
    quests,
  }
  memoryCache.set(key, snapshot)
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch (error) {
    console.warn('Could not cache daily quests for this browser tab.', error)
  }
}

export function invalidateDailyQuestCache(userId?: string): void {
  if (typeof window === 'undefined') return
  if (userId) {
    const key = `${CACHE_PREFIX}${userId}`
    memoryCache.delete(key)
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn('Could not clear daily quest cache for this browser tab.', error)
    }
    return
  }

  memoryCache.clear()
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key?.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key)
    }
  } catch (error) {
    console.warn('Could not clear daily quest cache for this browser tab.', error)
  }
}
