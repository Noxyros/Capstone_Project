type BankSubject = {
  id: string
  name: string
  icon: string | null
  color: string | null
  grade: { id: string; name: string; level: number } | null
  questionCount: number
}

type BankChapter = {
  id: string
  title: string
  order: number
  questionCount: number
}

type BankSubmoduleNode = {
  id: string
  title: string
  order: number
  type: string
  questionCount: number
}

type BankSubmodule = {
  id: string
  title: string
  order: number
  questionCount: number
  nodes: BankSubmoduleNode[]
}

type Mistake = {
  questionId: string
  prompt: string
  imageUrl?: string | null
  imageAlt?: string | null
  options: { id: string; text: string }[]
  allowsMultipleAnswers: boolean
  chapterId: string
  chapterTitle: string
  nodeId: string
  nodeTitle: string
  submoduleTitle: string | null
}

type MistakesResponse = { mistakes: Mistake[] }

export type { BankSubject, BankChapter, BankSubmodule, Mistake }

const PRACTICE_CACHE_TTL_MS = 5 * 60 * 1000
const PRACTICE_CACHE_PREFIX = 'questly_practice:v1:'
const PRACTICE_VERSION_KEY = 'questly_practice_version'
const PRACTICE_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000

const bankCache = new Map<string, { data: unknown; fetchedAt: number }>()
const bankRequests = new Map<string, Promise<unknown>>()

const PRACTICE_BROADCAST_CHANNEL = 'questly:practice'
let practiceChannel: BroadcastChannel | null = null

function getPracticeChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null
  if (!practiceChannel) {
    try {
      practiceChannel = new BroadcastChannel(PRACTICE_BROADCAST_CHANNEL)
    } catch {
      return null
    }
  }
  return practiceChannel
}

function currentPracticeVersion(): number {
  try {
    return Number(localStorage.getItem(PRACTICE_VERSION_KEY) ?? 0)
  } catch {
    return 0
  }
}

function bumpPracticeVersion(): void {
  try {
    const next = currentPracticeVersion() + 1
    localStorage.setItem(PRACTICE_VERSION_KEY, String(next))
  } catch {
    // ignore
  }
}

function cacheKey(kind: string, scope: string): string {
  return `${scope}:${kind}`
}

function isBankSubjectsResponse(value: unknown): value is { subjects: BankSubject[] } {
  return typeof value === 'object'
    && value !== null
    && 'subjects' in value
    && Array.isArray(value.subjects)
    && value.subjects.every((subject) =>
      typeof subject === 'object'
      && subject !== null
      && 'id' in subject && typeof subject.id === 'string'
      && 'name' in subject && typeof subject.name === 'string'
      && 'questionCount' in subject && typeof subject.questionCount === 'number')
}

function isBankChaptersResponse(value: unknown): value is { chapters: BankChapter[] } {
  return typeof value === 'object'
    && value !== null
    && 'chapters' in value
    && Array.isArray(value.chapters)
    && value.chapters.every((chapter) =>
      typeof chapter === 'object'
      && chapter !== null
      && 'id' in chapter && typeof chapter.id === 'string'
      && 'title' in chapter && typeof chapter.title === 'string'
      && 'order' in chapter && typeof chapter.order === 'number'
      && 'questionCount' in chapter && typeof chapter.questionCount === 'number')
}

function isBankSubmodulesResponse(value: unknown): value is { submodules: BankSubmodule[] } {
  return typeof value === 'object'
    && value !== null
    && 'submodules' in value
    && Array.isArray(value.submodules)
    && value.submodules.every((submodule) =>
      typeof submodule === 'object'
      && submodule !== null
      && 'id' in submodule && typeof submodule.id === 'string'
      && 'title' in submodule && typeof submodule.title === 'string'
      && 'order' in submodule && typeof submodule.order === 'number'
      && 'questionCount' in submodule && typeof submodule.questionCount === 'number'
      && 'nodes' in submodule && Array.isArray(submodule.nodes))
}

function isMistakesResponse(value: unknown): value is MistakesResponse {
  return typeof value === 'object'
    && value !== null
    && 'mistakes' in value
    && Array.isArray(value.mistakes)
    && value.mistakes.every((mistake) =>
      typeof mistake === 'object'
      && mistake !== null
      && 'questionId' in mistake && typeof mistake.questionId === 'string'
      && 'prompt' in mistake && typeof mistake.prompt === 'string'
      && (!('imageUrl' in mistake) || mistake.imageUrl === null || typeof mistake.imageUrl === 'string')
      && (!('imageAlt' in mistake) || mistake.imageAlt === null || typeof mistake.imageAlt === 'string')
      && 'options' in mistake && Array.isArray(mistake.options)
      && mistake.options.every((option: unknown) =>
        typeof option === 'object'
        && option !== null
        && 'id' in option && typeof option.id === 'string'
        && 'text' in option && typeof option.text === 'string')
      && 'allowsMultipleAnswers' in mistake && typeof mistake.allowsMultipleAnswers === 'boolean'
      && 'chapterId' in mistake && typeof mistake.chapterId === 'string'
      && 'chapterTitle' in mistake && typeof mistake.chapterTitle === 'string'
      && 'nodeId' in mistake && typeof mistake.nodeId === 'string'
      && 'nodeTitle' in mistake && typeof mistake.nodeTitle === 'string'
      && 'submoduleTitle' in mistake
      && (typeof mistake.submoduleTitle === 'string' || mistake.submoduleTitle === null))
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const result: unknown = await response.json()
    if (typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string') {
      return result.error
    }
  } catch {
    // ignore
  }
  return fallback
}

function getCached(kind: string, scope: string, validator: (value: unknown) => boolean): unknown | null {
  const key = cacheKey(kind, scope)
  const cached = bankCache.get(key)
  if (cached) return cached.data

  try {
    const snapshot = sessionStorage.getItem(`${PRACTICE_CACHE_PREFIX}${key}`)
    if (!snapshot) return null
    const parsed: unknown = JSON.parse(snapshot)
    if (typeof parsed !== 'object' || parsed === null) {
      sessionStorage.removeItem(`${PRACTICE_CACHE_PREFIX}${key}`)
      return null
    }
    const record = parsed as Record<string, unknown>
    if (
      !validator(parsed)
      || typeof record.expiresAt !== 'number'
      || record.expiresAt <= Date.now()
      || typeof record.version !== 'number'
      || record.version !== currentPracticeVersion()
    ) {
      sessionStorage.removeItem(`${PRACTICE_CACHE_PREFIX}${key}`)
      return null
    }
    const fetchedAt = typeof record.fetchedAt === 'number' && record.fetchedAt <= Date.now()
      ? record.fetchedAt
      : 0
    bankCache.set(key, { data: parsed, fetchedAt })
    return parsed
  } catch {
    return null
  }
}

function requestData(
  kind: string,
  scope: string,
  key: string,
  url: string,
  validator: (value: unknown) => boolean,
): Promise<unknown> {
  const inFlight = bankRequests.get(key)
  if (inFlight) return inFlight

  const request = (async (): Promise<unknown> => {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error(await readError(response, 'Could not load practice data.'))
    const result: unknown = await response.json()
    if (!validator(result)) throw new Error('The server returned invalid practice data.')

    bankCache.set(key, { data: result, fetchedAt: Date.now() })
    try {
      sessionStorage.setItem(`${PRACTICE_CACHE_PREFIX}${key}`, JSON.stringify({
        data: result,
        fetchedAt: Date.now(),
        expiresAt: Date.now() + PRACTICE_SNAPSHOT_TTL_MS,
        version: currentPracticeVersion(),
      }))
    } catch {
      // ignore
    }
    return result
  })()

  bankRequests.set(key, request)
  void request.then(
    () => { if (bankRequests.get(key) === request) bankRequests.delete(key) },
    () => { if (bankRequests.get(key) === request) bankRequests.delete(key) },
  )
  return request
}

export function loadBankSubjects(scope: string, options: { force?: boolean } = {}): Promise<BankSubject[]> {
  const key = cacheKey('bank-subjects', scope)
  const cached = getCached('bank-subjects', scope, isBankSubjectsResponse) as { subjects: BankSubject[] } | null
  if (!options.force && cached && Date.now() - (bankCache.get(key)?.fetchedAt ?? 0) < PRACTICE_CACHE_TTL_MS) {
    return Promise.resolve(cached.subjects)
  }
  const inFlight = bankRequests.get(key)
  if (cached && !options.force) {
    if (!inFlight) {
      void requestData('bank-subjects', scope, key, '/api/practice/bank', isBankSubjectsResponse)
        .catch(() => { /* background refresh failure is non-fatal */ })
    }
    return Promise.resolve(cached.subjects)
  }
  return requestData('bank-subjects', scope, key, '/api/practice/bank', isBankSubjectsResponse)
    .then((res) => (res as { subjects: BankSubject[] }).subjects) as Promise<BankSubject[]>
}

export function getCachedBankSubjects(scope: string): BankSubject[] | null {
  const cached = getCached('bank-subjects', scope, isBankSubjectsResponse) as { subjects: BankSubject[] } | null
  return cached ? cached.subjects : null
}

export function loadBankChapters(subjectId: string, scope: string, options: { force?: boolean } = {}): Promise<BankChapter[]> {
  const kind = `bank-chapters:${subjectId}`
  const key = cacheKey(kind, scope)
  const cached = getCached(kind, scope, isBankChaptersResponse) as { chapters: BankChapter[] } | null
  if (!options.force && cached && Date.now() - (bankCache.get(key)?.fetchedAt ?? 0) < PRACTICE_CACHE_TTL_MS) {
    return Promise.resolve(cached.chapters)
  }
  const inFlight = bankRequests.get(key)
  if (cached && !options.force) {
    if (!inFlight) {
      void requestData(kind, scope, key, `/api/practice/bank/${subjectId}/chapters`, isBankChaptersResponse)
        .catch(() => { /* background refresh failure is non-fatal */ })
    }
    return Promise.resolve(cached.chapters)
  }
  return requestData(kind, scope, key, `/api/practice/bank/${subjectId}/chapters`, isBankChaptersResponse)
    .then((res) => (res as { chapters: BankChapter[] }).chapters) as Promise<BankChapter[]>
}

export function getCachedBankChapters(subjectId: string, scope: string): BankChapter[] | null {
  const cached = getCached(`bank-chapters:${subjectId}`, scope, isBankChaptersResponse) as { chapters: BankChapter[] } | null
  return cached ? cached.chapters : null
}

export function loadBankSubmodules(
  subjectId: string,
  chapterId: string,
  scope: string,
  options: { force?: boolean } = {},
): Promise<BankSubmodule[]> {
  const kind = `bank-submodules:${subjectId}:${chapterId}`
  const key = cacheKey(kind, scope)
  const cached = getCached(kind, scope, isBankSubmodulesResponse) as { submodules: BankSubmodule[] } | null
  if (!options.force && cached && Date.now() - (bankCache.get(key)?.fetchedAt ?? 0) < PRACTICE_CACHE_TTL_MS) {
    return Promise.resolve(cached.submodules)
  }
  const inFlight = bankRequests.get(key)
  if (cached && !options.force) {
    if (!inFlight) {
      void requestData(kind, scope, key, `/api/practice/bank/${subjectId}/${chapterId}/submodules`, isBankSubmodulesResponse)
        .catch(() => { /* background refresh failure is non-fatal */ })
    }
    return Promise.resolve(cached.submodules)
  }
  return requestData(kind, scope, key, `/api/practice/bank/${subjectId}/${chapterId}/submodules`, isBankSubmodulesResponse)
    .then((res) => (res as { submodules: BankSubmodule[] }).submodules) as Promise<BankSubmodule[]>
}

export function getCachedBankSubmodules(subjectId: string, chapterId: string, scope: string): BankSubmodule[] | null {
  const cached = getCached(`bank-submodules:${subjectId}:${chapterId}`, scope, isBankSubmodulesResponse) as { submodules: BankSubmodule[] } | null
  return cached ? cached.submodules : null
}

export function loadMistakes(scope: string, options: { force?: boolean } = {}): Promise<Mistake[]> {
  const key = cacheKey('bank-mistakes', scope)
  const cached = getCached('bank-mistakes', scope, isMistakesResponse) as MistakesResponse | null
  if (!options.force && cached && Date.now() - (bankCache.get(key)?.fetchedAt ?? 0) < PRACTICE_CACHE_TTL_MS) {
    return Promise.resolve(cached.mistakes)
  }
  const inFlight = bankRequests.get(key)
  if (cached && !options.force) {
    if (!inFlight) {
      void requestData('bank-mistakes', scope, key, '/api/practice/mistakes', isMistakesResponse)
        .catch(() => { /* background refresh failure is non-fatal */ })
    }
    return Promise.resolve(cached.mistakes)
  }
  return requestData('bank-mistakes', scope, key, '/api/practice/mistakes', isMistakesResponse)
    .then((res) => (res as MistakesResponse).mistakes) as Promise<Mistake[]>
}

export function getCachedMistakes(scope: string): Mistake[] | null {
  const cached = getCached('bank-mistakes', scope, isMistakesResponse) as MistakesResponse | null
  return cached ? cached.mistakes : null
}

export function invalidatePracticeCache(scope?: string): void {
  if (!scope) {
    bankCache.clear()
    bankRequests.clear()
  } else {
    for (const key of bankCache.keys()) {
      if (key.startsWith(`${scope}:`)) bankCache.delete(key)
    }
    for (const key of bankRequests.keys()) {
      if (key.startsWith(`${scope}:`)) bankRequests.delete(key)
    }
  }
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index)
      if (key?.startsWith(PRACTICE_CACHE_PREFIX)
        && (!scope || key.startsWith(`${PRACTICE_CACHE_PREFIX}${scope}:`))) {
        sessionStorage.removeItem(key)
      }
    }
  } catch {
    // ignore
  }
}

export function notifyPracticeChanged(): void {
  bumpPracticeVersion()
  invalidatePracticeCache()
  const channel = getPracticeChannel()
  if (channel) {
    channel.postMessage({ type: 'practice-changed', at: Date.now() })
  }
}

export function subscribeToPracticeChanges(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const channel = getPracticeChannel()
  if (!channel) return () => {}
  const handler = (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === 'practice-changed') {
      invalidatePracticeCache()
      listener()
    }
  }
  channel.addEventListener('message', handler)
  return () => channel.removeEventListener('message', handler)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === PRACTICE_VERSION_KEY) {
      bankCache.clear()
      bankRequests.clear()
    }
  })
}

// ============================================================================
// Weak skills cache (original practiceClient.ts content, preserved)
// ============================================================================

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
