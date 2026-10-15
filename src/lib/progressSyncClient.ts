import { cacheDailyQuests } from '@/src/lib/dailyQuestClient'
import { invalidateWeakSkillsCache } from '@/src/lib/practiceClient'
import { isAppProfile, type AppProfile } from '@/src/lib/appProfile'
import { markNodeCompletedLocally } from '@/src/lib/curriculumClient'
import { isDailyQuestProgress } from '@/src/lib/dailyQuests'

const PROGRESS_QUEUE_PREFIX = 'questly_pending_progress:v1:'
export const PROGRESS_SYNC_EVENT = 'questly:progress-sync'

type PendingProgress = {
  id: string
  nodeId: string
  attemptId: string | null
}

export type ProgressSyncEventDetail = {
  userId: string
  status: 'queued' | 'synced' | 'failed'
  message?: string
}

type ProgressSyncResult = {
  profile: AppProfile
}

const syncRequests = new Map<string, Promise<ProgressSyncResult[]>>()

function queueKey(userId: string): string {
  return `${PROGRESS_QUEUE_PREFIX}${userId}`
}

function isPendingProgress(value: unknown): value is PendingProgress {
  return typeof value === 'object'
    && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'nodeId' in value && typeof value.nodeId === 'string'
    && 'attemptId' in value && (typeof value.attemptId === 'string' || value.attemptId === null)
}

function readQueue(userId: string): PendingProgress[] {
  const value = localStorage.getItem(queueKey(userId))
  if (!value) return []
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed) || !parsed.every(isPendingProgress)) {
    throw new Error('Saved learning progress could not be read from this device.')
  }
  return parsed
}

function writeQueue(userId: string, queue: PendingProgress[]): void {
  const key = queueKey(userId)
  if (queue.length === 0) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(queue))
  }
}

function notifyProgressSync(detail: ProgressSyncEventDetail): void {
  window.dispatchEvent(new CustomEvent<ProgressSyncEventDetail>(PROGRESS_SYNC_EVENT, { detail }))
}

export function enqueueNodeProgress(userId: string, nodeId: string, attemptId?: string): void {
  if (!userId || !nodeId) throw new Error('A learner and learning activity are required.')
  const queue = readQueue(userId)
  const normalizedAttemptId = attemptId ?? null
  const alreadyQueued = queue.some((entry) => entry.nodeId === nodeId && entry.attemptId === normalizedAttemptId)
  if (!alreadyQueued) {
    queue.push({
      id: crypto.randomUUID(),
      nodeId,
      attemptId: normalizedAttemptId,
    })
    writeQueue(userId, queue)
  }
  markNodeCompletedLocally(userId, nodeId)
  notifyProgressSync({ userId, status: 'queued' })
}

export function syncPendingProgress(userId: string): Promise<ProgressSyncResult[]> {
  if (!userId || typeof window === 'undefined') return Promise.resolve([])
  const existing = syncRequests.get(userId)
  if (existing) return existing

  const request = (async () => {
    const results: ProgressSyncResult[] = []
    while (true) {
      const item = readQueue(userId)[0]
      if (!item) break
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId: item.nodeId, ...(item.attemptId ? { attemptId: item.attemptId } : {}) }),
      })
      let payload: unknown
      try {
        payload = await response.json()
      } catch {
        throw new Error('The progress sync returned an unreadable response.')
      }
      if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : 'Could not sync saved learning progress.'
        throw new Error(message)
      }
      if (
        typeof payload !== 'object'
        || payload === null
        || !('profile' in payload)
        || !isAppProfile(payload.profile)
        || !('rewards' in payload)
        || typeof payload.rewards !== 'object'
        || payload.rewards === null
        || !('xp' in payload.rewards)
        || typeof payload.rewards.xp !== 'number'
        || !('gems' in payload.rewards)
        || typeof payload.rewards.gems !== 'number'
      ) {
        throw new Error('The server returned invalid synced learning progress.')
      }
      if ('quests' in payload) {
        if (!Array.isArray(payload.quests) || !payload.quests.every(isDailyQuestProgress)) {
          throw new Error('The server returned invalid synced daily quest progress.')
        }
        cacheDailyQuests(userId, payload.quests)
      }

      const remaining = readQueue(userId).filter((entry) => entry.id !== item.id)
      writeQueue(userId, remaining)
      markNodeCompletedLocally(userId, item.nodeId)
      invalidateWeakSkillsCache()
      results.push({ profile: payload.profile })
    }
    return results
  })()

  syncRequests.set(userId, request)
  void request.then(
    () => { if (syncRequests.get(userId) === request) syncRequests.delete(userId) },
    (error: unknown) => {
      if (syncRequests.get(userId) === request) syncRequests.delete(userId)
      notifyProgressSync({
        userId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Could not sync saved learning progress.',
      })
    },
  )
  void request.then(() => notifyProgressSync({ userId, status: 'synced' }), () => {})
  return request
}
