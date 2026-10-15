export type WeakSkillArea = {
  nodeId: string
  chapterId: string
  nodeTitle: string
  chapterTitle: string
  submoduleTitle: string | null
  score: number
}

export type WeakSkillsResponse = { areas: WeakSkillArea[] }

const WEAK_SKILLS_CACHE_PREFIX = 'questly_weak_skills:v1:'
const WEAK_SKILLS_CACHE_TTL_MS = 2 * 60 * 1000
const weakSkillsCache = new Map<string, { expiresAt: number; data: WeakSkillsResponse }>()
const weakSkillsRequests = new Map<string, Promise<WeakSkillsResponse>>()

function isWeakSkillsResponse(value: unknown): value is WeakSkillsResponse {
  return typeof value === 'object'
    && value !== null
    && 'areas' in value
    && Array.isArray(value.areas)
    && value.areas.every((area) =>
      typeof area === 'object'
      && area !== null
      && 'nodeId' in area && typeof area.nodeId === 'string'
      && 'chapterId' in area && typeof area.chapterId === 'string'
      && 'nodeTitle' in area && typeof area.nodeTitle === 'string'
      && 'chapterTitle' in area && typeof area.chapterTitle === 'string'
      && 'submoduleTitle' in area
      && (typeof area.submoduleTitle === 'string' || area.submoduleTitle === null)
      && 'score' in area && typeof area.score === 'number'
      && Number.isInteger(area.score) && area.score >= 0 && area.score < 80
    )
}

export function getCachedWeakSkills(userId: string): WeakSkillsResponse | null {
  if (!userId || typeof window === 'undefined') return null
  const key = `${WEAK_SKILLS_CACHE_PREFIX}${userId}`
  let cached = weakSkillsCache.get(key)

  if (!cached) {
    try {
      const snapshot = sessionStorage.getItem(key)
      if (!snapshot) return null
      const parsed: unknown = JSON.parse(snapshot)
      if (
        typeof parsed !== 'object'
        || parsed === null
        || !('expiresAt' in parsed)
        || typeof parsed.expiresAt !== 'number'
        || parsed.expiresAt <= Date.now()
        || !('data' in parsed)
        || !isWeakSkillsResponse(parsed.data)
      ) {
        sessionStorage.removeItem(key)
        return null
      }
      cached = { expiresAt: parsed.expiresAt, data: parsed.data }
      weakSkillsCache.set(key, cached)
    } catch (error) {
      console.warn('Could not restore weak skills from this browser tab.', error)
      return null
    }
  }

  if (cached.expiresAt <= Date.now()) {
    weakSkillsCache.delete(key)
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn('Could not remove expired weak skills from this browser tab.', error)
    }
    return null
  }
  return cached.data
}

export async function loadWeakSkills(userId: string, refresh = false): Promise<WeakSkillsResponse> {
  if (!userId) throw new Error('A learner account is required to load weak skills.')
  if (!refresh) {
    const cached = getCachedWeakSkills(userId)
    if (cached) return cached
    const pending = weakSkillsRequests.get(userId)
    if (pending) return pending
  }

  const request = (async () => {
    const response = await fetch('/api/practice/weak-skills', { cache: 'no-store' })
    const payload: unknown = await response.json()
    if (!response.ok) {
      throw new Error(
        typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not load weak quiz topics.'
      )
    }
    if (!isWeakSkillsResponse(payload)) throw new Error('Weak quiz topic data is invalid.')

    const entry = { expiresAt: Date.now() + WEAK_SKILLS_CACHE_TTL_MS, data: payload }
    weakSkillsCache.set(`${WEAK_SKILLS_CACHE_PREFIX}${userId}`, entry)
    try {
      sessionStorage.setItem(`${WEAK_SKILLS_CACHE_PREFIX}${userId}`, JSON.stringify(entry))
    } catch (error) {
      console.warn('Could not cache weak skills for this browser tab.', error)
    }
    return payload
  })()

  weakSkillsRequests.set(userId, request)
  try {
    return await request
  } finally {
    if (weakSkillsRequests.get(userId) === request) weakSkillsRequests.delete(userId)
  }
}

export function invalidateWeakSkillsCache(): void {
  weakSkillsCache.clear()
  weakSkillsRequests.clear()
  if (typeof window === 'undefined') return
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key?.startsWith(WEAK_SKILLS_CACHE_PREFIX)) sessionStorage.removeItem(key)
    }
  } catch (error) {
    console.warn('Could not clear weak skills from this browser tab.', error)
  }
}
