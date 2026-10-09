export type LeaderboardRow = {
  id: string
  name: string | null
  handle: string | null
  avatarUrl: string | null
  weeklyXp: number
  rank: number
}

export type LeaderboardData = {
  weekStart: string
  rows: LeaderboardRow[]
  currentUserId: string
}

const CACHE_PREFIX = 'questly_leaderboard:'
const CACHE_TTL_MS = 60 * 1000
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000
const memoryCache = new Map<string, { data: LeaderboardData; fetchedAt: number }>()
const requests = new Map<string, Promise<LeaderboardData>>()

function isLeaderboardData(value: unknown): value is LeaderboardData {
  return typeof value === 'object'
    && value !== null
    && 'weekStart' in value
    && typeof value.weekStart === 'string'
    && 'currentUserId' in value
    && typeof value.currentUserId === 'string'
    && 'rows' in value
    && Array.isArray(value.rows)
    && value.rows.every((row) => typeof row === 'object'
      && row !== null
      && 'id' in row && typeof row.id === 'string'
      && 'weeklyXp' in row && typeof row.weeklyXp === 'number'
      && 'rank' in row && typeof row.rank === 'number'
      && 'name' in row && (typeof row.name === 'string' || row.name === null)
      && 'handle' in row && (typeof row.handle === 'string' || row.handle === null)
      && 'avatarUrl' in row && (typeof row.avatarUrl === 'string' || row.avatarUrl === null))
}

export function getCachedLeaderboard(authUserId: string): LeaderboardData | null {
  const cached = memoryCache.get(authUserId)
  if (cached) return cached.data
  try {
    const snapshot = sessionStorage.getItem(`${CACHE_PREFIX}${authUserId}`)
    if (!snapshot) return null
    const value: unknown = JSON.parse(snapshot)
    if (
      typeof value !== 'object'
      || value === null
      || !('data' in value)
      || !isLeaderboardData(value.data)
      || !('expiresAt' in value)
      || typeof value.expiresAt !== 'number'
      || value.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${authUserId}`)
      return null
    }
    memoryCache.set(authUserId, { data: value.data, fetchedAt: 0 })
    return value.data
  } catch (error) {
    console.warn('Could not restore the cached leaderboard for this browser tab.', error)
    return null
  }
}

export function invalidateLeaderboardCache(authUserId?: string): void {
  if (authUserId) memoryCache.delete(authUserId)
  else memoryCache.clear()
  try {
    if (authUserId) sessionStorage.removeItem(`${CACHE_PREFIX}${authUserId}`)
    else {
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index)
        if (key?.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.warn('Could not clear the cached leaderboard for this browser tab.', error)
  }
}

export async function loadLeaderboard(authUserId: string): Promise<LeaderboardData> {
  const cached = memoryCache.get(authUserId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data
  const inFlight = requests.get(authUserId)
  if (inFlight) return inFlight

  const request = (async () => {
    const response = await fetch('/api/leaderboard', { cache: 'no-store' })
    const result: unknown = await response.json()
    if (!response.ok) {
      const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
        ? result.error
        : 'Could not load the leaderboard.'
      throw new Error(message)
    }
    if (!isLeaderboardData(result)) throw new Error('The server returned invalid leaderboard data.')

    memoryCache.set(authUserId, { data: result, fetchedAt: Date.now() })
    try {
      sessionStorage.setItem(`${CACHE_PREFIX}${authUserId}`, JSON.stringify({
        data: result,
        expiresAt: Date.now() + SNAPSHOT_TTL_MS,
      }))
    } catch (error) {
      console.warn('Could not cache the leaderboard for this browser tab.', error)
    }
    return result
  })()
  requests.set(authUserId, request)
  try {
    return await request
  } finally {
    if (requests.get(authUserId) === request) requests.delete(authUserId)
  }
}
