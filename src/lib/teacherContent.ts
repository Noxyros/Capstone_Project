export type CurriculumOption = {
  id: string
  text: string
  isCorrect: boolean
}

export type CurriculumQuestion = {
  id: string
  prompt: string
  options: CurriculumOption[]
}

export type CurriculumNode = {
  id: string
  title: string
  type: 'lesson' | 'quiz'
  status: 'locked' | 'current' | 'completed'
  contentType: 'text' | 'poster' | 'material'
  content: string
  resourceUrl: string
  questions: CurriculumQuestion[]
}

export type CurriculumChapter = {
  id: string
  title: string
  order: number
  summary: string
  chaptersStatus: 'completed' | 'in_progress' | 'locked'
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
