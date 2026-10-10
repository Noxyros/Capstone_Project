export type DailyQuestMetric = 'lessons' | 'quizzes' | 'perfectQuizzes' | 'activities' | 'chapters'
export type DailyQuestGroup = 'lesson' | 'quiz' | 'journey'

export type DailyQuest = {
  id: string
  group: DailyQuestGroup
  metric: DailyQuestMetric
  target: number
  xpReward: number
  title: { en: string; id: string }
  description: { en: string; id: string }
}

export type DailyQuestProgress = DailyQuest & {
  current: number
  completed: boolean
  rewarded: boolean
}

export function isDailyQuestProgress(value: unknown): value is DailyQuestProgress {
  return typeof value === 'object'
    && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'group' in value && (value.group === 'lesson' || value.group === 'quiz' || value.group === 'journey')
    && 'metric' in value && ['lessons', 'quizzes', 'perfectQuizzes', 'activities', 'chapters'].includes(value.metric as string)
    && 'target' in value && typeof value.target === 'number' && value.target > 0
    && 'xpReward' in value && typeof value.xpReward === 'number' && value.xpReward >= 0
    && 'title' in value && typeof value.title === 'object' && value.title !== null
    && 'en' in value.title && typeof value.title.en === 'string'
    && 'id' in value.title && typeof value.title.id === 'string'
    && 'description' in value && typeof value.description === 'object' && value.description !== null
    && 'en' in value.description && typeof value.description.en === 'string'
    && 'id' in value.description && typeof value.description.id === 'string'
    && 'current' in value && typeof value.current === 'number'
    && 'completed' in value && typeof value.completed === 'boolean'
    && 'rewarded' in value && typeof value.rewarded === 'boolean'
}

export function jakartaCalendarDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function jakartaDateKey(date = new Date()): string {
  return jakartaCalendarDateKey(date)
}

export function nextJakartaDailyReset(date = new Date()): Date {
  const calendarDate = jakartaCalendarDateKey(date)
  const [year, month, day] = calendarDate.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!, 17))
}

export function secondsUntilJakartaDailyReset(date = new Date()): number {
  return Math.max(0, Math.ceil((nextJakartaDailyReset(date).getTime() - date.getTime()) / 1000))
}

const lessonQuests: DailyQuest[] = [
  {
    id: 'lesson-one',
    group: 'lesson',
    metric: 'lessons',
    target: 1,
    xpReward: 15,
    title: { en: 'Warm up', id: 'Mulai belajar' },
    description: { en: 'Complete 1 lesson.', id: 'Selesaikan 1 pelajaran.' },
  },
  {
    id: 'lesson-two',
    group: 'lesson',
    metric: 'lessons',
    target: 2,
    xpReward: 25,
    title: { en: 'Lesson streak', id: 'Lanjutkan belajar' },
    description: { en: 'Complete 2 lessons.', id: 'Selesaikan 2 pelajaran.' },
  },
]

const quizQuests: DailyQuest[] = [
  {
    id: 'quiz-one',
    group: 'quiz',
    metric: 'quizzes',
    target: 1,
    xpReward: 15,
    title: { en: 'Quiz time', id: 'Saatnya kuis' },
    description: { en: 'Finish 1 quiz.', id: 'Selesaikan 1 kuis.' },
  },
  {
    id: 'quiz-two',
    group: 'quiz',
    metric: 'quizzes',
    target: 2,
    xpReward: 25,
    title: { en: 'Quiz explorer', id: 'Jago kuis' },
    description: { en: 'Finish 2 quizzes.', id: 'Selesaikan 2 kuis.' },
  },
  {
    id: 'perfect-quiz',
    group: 'quiz',
    metric: 'perfectQuizzes',
    target: 1,
    xpReward: 25,
    title: { en: 'Perfect score', id: 'Kuis sempurna' },
    description: { en: 'Get every answer right in a quiz.', id: 'Jawab semua soal kuis dengan benar.' },
  },
]

const journeyQuests: DailyQuest[] = [
  {
    id: 'activities-two',
    group: 'journey',
    metric: 'activities',
    target: 2,
    xpReward: 15,
    title: { en: 'Keep learning', id: 'Terus belajar' },
    description: { en: 'Complete 2 learning activities.', id: 'Selesaikan 2 aktivitas belajar.' },
  },
  {
    id: 'activities-three',
    group: 'journey',
    metric: 'activities',
    target: 3,
    xpReward: 20,
    title: { en: 'Learning momentum', id: 'Makin semangat!' },
    description: { en: 'Complete 3 learning activities.', id: 'Selesaikan 3 aktivitas belajar.' },
  },
  {
    id: 'chapters-two',
    group: 'journey',
    metric: 'chapters',
    target: 2,
    xpReward: 25,
    title: { en: 'Branch out', id: 'Coba bab lain' },
    description: { en: 'Complete an activity in each of 2 chapters.', id: 'Selesaikan aktivitas belajar di 2 bab.' },
  },
]

function createSeededRandom(seed: string): () => number {
  let state = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index)
    state = Math.imul(state, 16777619)
  }

  return () => {
    state += 0x6D2B79F5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function choose<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!
}

export function getDailyQuestSet(
  userId: string,
  date: string,
  availability: { hasLessons: boolean; hasQuizzes: boolean; hasMultipleChapters: boolean },
): DailyQuest[] {
  const random = createSeededRandom(`${userId}:${date}`)
  const fallbackLessons = lessonQuests.map((quest) => ({
    ...quest,
    metric: 'activities' as const,
    title: quest.target === 1
      ? { en: 'Take a first step', id: 'Mulai belajar' }
      : { en: 'Keep learning', id: 'Terus belajar' },
    description: quest.target === 1
      ? { en: 'Complete 1 learning step.', id: 'Selesaikan 1 aktivitas belajar.' }
      : { en: 'Complete 2 learning steps.', id: 'Selesaikan 2 aktivitas belajar.' },
  }))
  const fallbackQuizzes = quizQuests.map((quest) => ({
    ...quest,
    metric: 'activities' as const,
    title: quest.target === 1
      ? { en: 'Complete a learning step', id: 'Satu langkah lagi' }
      : { en: 'Complete more learning', id: 'Tambah semangat' },
    description: quest.target === 1
      ? { en: 'Complete 1 learning step.', id: 'Selesaikan 1 aktivitas belajar.' }
      : { en: 'Complete 2 learning steps.', id: 'Selesaikan 2 aktivitas belajar.' },
  }))
  const lessons = choose(availability.hasLessons ? lessonQuests : fallbackLessons, random)
  const quizOptions = availability.hasQuizzes
    ? quizQuests
    : fallbackQuizzes.filter((quest) => quest.target !== lessons.target)
  const quizzes = choose(quizOptions, random)
  const journeys = availability.hasMultipleChapters
    ? journeyQuests
    : journeyQuests.filter((quest) => quest.id !== 'chapters-two')
  const distinctJourneys = journeys.filter((quest) =>
    quest.metric !== lessons.metric || quest.target !== lessons.target)
    .filter((quest) => quest.metric !== quizzes.metric || quest.target !== quizzes.target)
  const journey = choose(distinctJourneys.length > 0 ? distinctJourneys : journeys, random)
  return [lessons, quizzes, journey]
}
