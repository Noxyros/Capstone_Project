import type { CurriculumSubject } from '@/src/lib/teacherContent'
import { isAppProfile, type AppProfile } from '@/src/lib/appProfile'
import { invalidateDailyQuestCache } from '@/src/lib/dailyQuestClient'

const CURRICULUM_CACHE_TTL_MS = 5 * 60 * 1000
const CURRICULUM_CACHE_PREFIX = 'questly_curriculum:v4:'
const CURRICULUM_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000
const curriculumCache = new Map<string, { subjects: CurriculumSubject[]; fetchedAt: number }>()
const curriculumRequests = new Map<string, Promise<CurriculumSubject[]>>()

function cacheKey(view: 'teacher' | undefined, scope: string): string {
  return `${scope}:${view ?? 'learner'}`
}

function isCurriculumSubjects(value: unknown): value is CurriculumSubject[] {
  return Array.isArray(value) && value.every((subject) =>
    typeof subject === 'object'
    && subject !== null
    && 'id' in subject && typeof subject.id === 'string'
    && 'name' in subject && typeof subject.name === 'string'
    && 'chapters' in subject
    && Array.isArray(subject.chapters)
    && subject.chapters.every((chapter: unknown) =>
      typeof chapter === 'object'
      && chapter !== null
      && 'submodules' in chapter
      && Array.isArray(chapter.submodules)
      && 'nodes' in chapter
      && Array.isArray(chapter.nodes)))
}

export function getCachedCurriculum(view?: 'teacher', scope = 'public'): CurriculumSubject[] | null {
  const key = cacheKey(view, scope)
  const cached = curriculumCache.get(key)
  if (cached) return cached.subjects

  try {
    const snapshot = sessionStorage.getItem(`${CURRICULUM_CACHE_PREFIX}${key}`)
    if (!snapshot) return null
    const parsed: unknown = JSON.parse(snapshot)
    if (
      typeof parsed !== 'object'
      || parsed === null
      || !('subjects' in parsed)
      || !isCurriculumSubjects(parsed.subjects)
      || !('expiresAt' in parsed)
      || typeof parsed.expiresAt !== 'number'
      || parsed.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(`${CURRICULUM_CACHE_PREFIX}${key}`)
      return null
    }
    curriculumCache.set(key, { subjects: parsed.subjects, fetchedAt: 0 })
    return parsed.subjects
  } catch (error) {
    console.warn('Could not restore cached curriculum for this browser tab.', error)
    return null
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const result: unknown = await response.json()
    if (typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string') {
      return result.error
    }
  } catch (error) {
    console.error('Failed to read an API error response.', error)
  }
  return fallback
}

export async function loadCurriculum(view?: 'teacher', scope = 'public'): Promise<CurriculumSubject[]> {
  const key = cacheKey(view, scope)
  const cached = curriculumCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CURRICULUM_CACHE_TTL_MS) return cached.subjects

  const inFlight = curriculumRequests.get(key)
  if (inFlight) return inFlight

  const request = (async () => {
    const url = view ? `/api/curriculum?view=${view}` : '/api/curriculum'
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error(await readError(response, 'Could not load curriculum.'))
    const result: unknown = await response.json()
    if (typeof result !== 'object' || result === null || !('subjects' in result) || !Array.isArray(result.subjects)) {
      throw new Error('The server returned invalid curriculum data.')
    }
    if (!isCurriculumSubjects(result.subjects)) throw new Error('The server returned invalid curriculum data.')
    const subjects = result.subjects
    curriculumCache.set(key, { subjects, fetchedAt: Date.now() })
    try {
      sessionStorage.setItem(`${CURRICULUM_CACHE_PREFIX}${key}`, JSON.stringify({
        subjects,
        expiresAt: Date.now() + CURRICULUM_SNAPSHOT_TTL_MS,
      }))
    } catch (error) {
      console.warn('Could not cache curriculum for this browser tab.', error)
    }
    return subjects
  })()
  curriculumRequests.set(key, request)
  try {
    return await request
  } finally {
    if (curriculumRequests.get(key) === request) curriculumRequests.delete(key)
  }
}

export function invalidateCurriculumCache(scope?: string): void {
  if (!scope) {
    curriculumCache.clear()
  } else {
    for (const key of curriculumCache.keys()) {
      if (key.startsWith(`${scope}:`)) curriculumCache.delete(key)
    }
  }
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key?.startsWith(CURRICULUM_CACHE_PREFIX)
        && (!scope || key.startsWith(`${CURRICULUM_CACHE_PREFIX}${scope}:`))) {
        sessionStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.warn('Could not clear cached curriculum for this browser tab.', error)
  }
}

export async function saveCurriculum(subjects: CurriculumSubject[]): Promise<void> {
  const response = await fetch('/api/curriculum', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subjects }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not save curriculum.'))
  invalidateCurriculumCache()
}

export async function saveNodeProgress(nodeId: string, attemptId?: string): Promise<{ profile: AppProfile; rewards: { xp: number; gems: number } }> {
  const response = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId, ...(attemptId ? { attemptId } : {}) }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not save learning progress.'))
  const result: unknown = await response.json()
  if (
    typeof result !== 'object'
    || result === null
    || !('profile' in result)
    || !isAppProfile(result.profile)
    || !('rewards' in result)
    || typeof result.rewards !== 'object'
    || result.rewards === null
    || !('xp' in result.rewards)
    || typeof result.rewards.xp !== 'number'
    || !('gems' in result.rewards)
    || typeof result.rewards.gems !== 'number'
  ) {
    throw new Error('The server returned invalid learning reward data.')
  }
  invalidateDailyQuestCache()
  invalidateCurriculumCache()
  return { profile: result.profile, rewards: { xp: result.rewards.xp, gems: result.rewards.gems } }
}
