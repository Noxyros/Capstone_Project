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
  rewardCurrency?: 'xp' | 'gems' | 'item'
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

export type SubjectColor =
  | 'blue'
  | 'green'
  | 'rose'
  | 'amber'
  | 'purple'
  | 'cyan'
  | 'orange'
  | 'indigo'
  | 'teal'
  | 'red'
  | 'lime'
  | 'pink'

export const VALID_SUBJECT_COLORS: readonly SubjectColor[] = [
  'blue',
  'green',
  'rose',
  'amber',
  'purple',
  'cyan',
  'orange',
  'indigo',
  'teal',
  'red',
  'lime',
  'pink',
] as const

export type CurriculumSubject = {
  id: string
  name: string
  grade: number
  icon: string
  color: SubjectColor
  chapters: CurriculumChapter[]
}

export function createCurriculumId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export const SUBJECT_ICON_OPTIONS = [
  { value: 'book', labelEn: 'Book', labelId: 'Buku' },
  { value: 'calculator', labelEn: 'Calculator', labelId: 'Kalkulator' },
  { value: 'flask', labelEn: 'Flask', labelId: 'Labu sains' },
  { value: 'atom', labelEn: 'Atom', labelId: 'Atom' },
  { value: 'dna', labelEn: 'DNA', labelId: 'DNA' },
  { value: 'globe', labelEn: 'Globe', labelId: 'Globe' },
  { value: 'languages', labelEn: 'Languages', labelId: 'Bahasa' },
  { value: 'landmark', labelEn: 'Landmark', labelId: 'Monumen' },
  { value: 'trending_up', labelEn: 'Chart', labelId: 'Grafik' },
  { value: 'shield', labelEn: 'Shield', labelId: 'Perisai' },
  { value: 'laptop', labelEn: 'Laptop', labelId: 'Laptop' },
  { value: 'palette', labelEn: 'Palette', labelId: 'Palet' },
  { value: 'music', labelEn: 'Music', labelId: 'Musik' },
  { value: 'activity', labelEn: 'Activity', labelId: 'Aktivitas' },
  { value: 'users', labelEn: 'Users', labelId: 'Masyarakat' },
  { value: 'leaf', labelEn: 'Leaf', labelId: 'Daun' },
  { value: 'sparkles', labelEn: 'Sparkles', labelId: 'Bintang' },
] as const

export const SUBJECT_COLOR_OPTIONS = [
  { value: 'blue' as const, labelEn: 'Blue', labelId: 'Biru' },
  { value: 'green' as const, labelEn: 'Green', labelId: 'Hijau' },
  { value: 'amber' as const, labelEn: 'Amber', labelId: 'Amber' },
  { value: 'rose' as const, labelEn: 'Rose', labelId: 'Rose' },
  { value: 'purple' as const, labelEn: 'Purple', labelId: 'Ungu' },
  { value: 'cyan' as const, labelEn: 'Cyan', labelId: 'Sian' },
  { value: 'orange' as const, labelEn: 'Orange', labelId: 'Oranye' },
  { value: 'indigo' as const, labelEn: 'Indigo', labelId: 'Indigo' },
  { value: 'teal' as const, labelEn: 'Teal', labelId: 'Teal' },
  { value: 'red' as const, labelEn: 'Red', labelId: 'Merah' },
  { value: 'lime' as const, labelEn: 'Lime', labelId: 'Lime' },
  { value: 'pink' as const, labelEn: 'Pink', labelId: 'Merah muda' },
] as const
