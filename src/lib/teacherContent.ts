export type CurriculumOption = {
  id: string
  text: string
  isCorrect?: boolean
}

export type CurriculumQuestion = {
  id: string
  prompt: string
  allowsMultipleAnswers?: boolean
  options: CurriculumOption[]
}

export type CurriculumNode = {
  id: string
  submoduleId?: string | null
  title: string
  type: 'lesson' | 'quiz' | 'boss' | 'treasure'
  status: 'locked' | 'current' | 'completed'
  contentType: 'text' | 'poster' | 'material'
  content: string
  resourceUrl: string
  questions: CurriculumQuestion[]
  rewardCurrency?: 'xp' | 'gems'
  rewardAmount?: number
}

export type CurriculumResourceFormat = 'image' | 'pdf' | 'presentation' | 'document'

export function getCurriculumResourceFormat(resourceUrl: string): CurriculumResourceFormat {
  const path = resourceUrl.split(/[?#]/, 1)[0].toLowerCase()
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(path)) return 'image'
  if (/\.pdf$/.test(path)) return 'pdf'
  if (/\.pptx?$/.test(path)) return 'presentation'
  return 'document'
}

export type CurriculumSubmodule = {
  id: string
  title: string
  order: number
  summary: string
  isPublished: boolean
}

export type CurriculumChapter = {
  id: string
  title: string
  order: number
  summary: string
  chaptersStatus: 'completed' | 'in_progress' | 'locked'
  submodules: CurriculumSubmodule[]
  nodes: CurriculumNode[]
}

export type CurriculumSubject = {
  id: string
  name: string
  grade: 7 | 8 | 9
  icon: string
  color: 'blue' | 'green' | 'rose' | 'amber' | 'purple' | 'cyan'
  chapters: CurriculumChapter[]
}

export function createCurriculumId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
