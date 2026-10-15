import type { CurriculumSubject } from '@/src/lib/teacherContent'
import { isAppProfile, type AppProfile } from '@/src/lib/appProfile'
import { cacheDailyQuests } from '@/src/lib/dailyQuestClient'
import { invalidateWeakSkillsCache } from '@/src/lib/practiceClient'
import { isDailyQuestProgress, type DailyQuestProgress } from '@/src/lib/dailyQuests'

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
    const fetchedAt = 'fetchedAt' in parsed
      && typeof parsed.fetchedAt === 'number'
      && parsed.fetchedAt <= Date.now()
      ? parsed.fetchedAt
      : 0
    curriculumCache.set(key, { subjects: parsed.subjects, fetchedAt })
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

function requestCurriculum(view: 'teacher' | undefined, scope: string, key: string): Promise<CurriculumSubject[]> {
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
    const existing = curriculumCache.get(key)?.subjects
    const completedNodeIds = new Set(existing?.flatMap((subject) =>
      subject.chapters.flatMap((chapter) =>
        chapter.nodes.filter((node) => node.status === 'completed').map((node) => node.id))) ?? [])
    const subjects = result.subjects.map((subject) => ({
      ...subject,
      chapters: subject.chapters.map((chapter) => {
        const nodes = chapter.nodes.map((node) => completedNodeIds.has(node.id)
          ? { ...node, status: 'completed' as const }
          : node)
        return {
          ...chapter,
          nodes,
          chaptersStatus: nodes.length > 0 && nodes.every((node) => node.status === 'completed')
            ? 'completed' as const
            : chapter.chaptersStatus === 'completed' ? 'in_progress' as const : chapter.chaptersStatus,
        }
      }),
    }))
    const fetchedAt = Date.now()
    curriculumCache.set(key, { subjects, fetchedAt })
    try {
      sessionStorage.setItem(`${CURRICULUM_CACHE_PREFIX}${key}`, JSON.stringify({
        subjects,
        fetchedAt,
        expiresAt: fetchedAt + CURRICULUM_SNAPSHOT_TTL_MS,
      }))
    } catch (error) {
      console.warn('Could not cache curriculum for this browser tab.', error)
    }
    return subjects
  })()
  curriculumRequests.set(key, request)
  void request.then(
    () => { if (curriculumRequests.get(key) === request) curriculumRequests.delete(key) },
    () => { if (curriculumRequests.get(key) === request) curriculumRequests.delete(key) },
  )
  return request
}

export function loadCurriculum(view?: 'teacher', scope = 'public'): Promise<CurriculumSubject[]> {
  const key = cacheKey(view, scope)
  getCachedCurriculum(view, scope)
  const cached = curriculumCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CURRICULUM_CACHE_TTL_MS) {
    return Promise.resolve(cached.subjects)
  }

  const inFlight = curriculumRequests.get(key)
  if (cached) {
    if (!inFlight) {
      void requestCurriculum(view, scope, key).catch((error: unknown) => {
        console.error('Failed to refresh cached learner curriculum in the background.', error)
      })
    }
    return Promise.resolve(cached.subjects)
  }
  return requestCurriculum(view, scope, key)
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

function storeCurriculumSnapshot(key: string, subjects: CurriculumSubject[], fetchedAt: number): void {
  try {
    sessionStorage.setItem(`${CURRICULUM_CACHE_PREFIX}${key}`, JSON.stringify({
      subjects,
      fetchedAt,
      expiresAt: Date.now() + CURRICULUM_SNAPSHOT_TTL_MS,
    }))
  } catch (error) {
    console.warn('Could not cache curriculum for this browser tab.', error)
  }
}

export function markNodeCompletedLocally(userId: string, nodeId: string): void {
  if (!userId || typeof window === 'undefined') return
  const key = cacheKey(undefined, userId)
  const existing = getCachedCurriculum(undefined, userId)
  if (!existing) return

  let changed = false
  const subjects = existing.map((subject) => ({
    ...subject,
    chapters: subject.chapters.map((chapter) => {
      const nodes = chapter.nodes.map((node) => {
        if (node.id !== nodeId || node.status === 'completed') return node
        changed = true
        return { ...node, status: 'completed' as const }
      })
      const chaptersStatus = nodes.length > 0 && nodes.every((node) => node.status === 'completed')
        ? 'completed' as const
        : chapter.chaptersStatus === 'completed' ? 'in_progress' as const : chapter.chaptersStatus
      return { ...chapter, nodes, chaptersStatus }
    }),
  }))
  if (!changed) return

  const fetchedAt = Date.now()
  curriculumCache.set(key, { subjects, fetchedAt })
  storeCurriculumSnapshot(key, subjects, fetchedAt)
}

export async function saveNodeProgress(nodeId: string, attemptId?: string): Promise<{
  profile: AppProfile
  rewards: { xp: number; gems: number }
  quests: DailyQuestProgress[]
}> {
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
    || !('quests' in result)
    || !Array.isArray(result.quests)
    || !result.quests.every(isDailyQuestProgress)
  ) {
    throw new Error('The server returned invalid learning reward data.')
  }
  cacheDailyQuests(result.profile.id, result.quests)
  invalidateWeakSkillsCache()
  markNodeCompletedLocally(result.profile.id, nodeId)
  return {
    profile: result.profile,
    rewards: { xp: result.rewards.xp, gems: result.rewards.gems },
    quests: result.quests,
  }
}
