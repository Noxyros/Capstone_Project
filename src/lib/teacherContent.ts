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
  { value: 'book', labelEn: 'Book / Bahasa Indonesia', labelId: 'Buku / Bahasa Indonesia' },
  { value: 'calculator', labelEn: 'Calculator / Mathematics', labelId: 'Kalkulator / Matematika' },
  { value: 'flask', labelEn: 'Science Flask / Science (IPA) & Chemistry', labelId: 'Labu Sains / IPA & Kimia' },
  { value: 'atom', labelEn: 'Atom / Physics', labelId: 'Atom / Fisika' },
  { value: 'dna', labelEn: 'DNA / Biology', labelId: 'DNA / Biologi' },
  { value: 'globe', labelEn: 'Globe / Social Studies (IPS) & Geography', labelId: 'Globe / IPS & Geografi' },
  { value: 'languages', labelEn: 'Languages / English', labelId: 'Bahasa / Bahasa Inggris' },
  { value: 'landmark', labelEn: 'Landmark / History', labelId: 'Monumen / Sejarah' },
  { value: 'trending_up', labelEn: 'Chart / Economics & Accounting', labelId: 'Grafik / Ekonomi & Akuntansi' },
  { value: 'shield', labelEn: 'Shield / Pancasila & Civics (PPKn)', labelId: 'Perisai / Pancasila & PPKn' },
  { value: 'laptop', labelEn: 'Laptop / Informatics & ICT', labelId: 'Laptop / Informatika & TIK' },
  { value: 'palette', labelEn: 'Palette / Arts & Culture (SBdP)', labelId: 'Palet / Seni Budaya (SBdP)' },
  { value: 'music', labelEn: 'Music / Performing Arts', labelId: 'Musik / Seni Musik' },
  { value: 'activity', labelEn: 'Activity / Physical Education (PJOK)', labelId: 'Aktivitas / Olahraga (PJOK)' },
  { value: 'users', labelEn: 'Community / Sociology', labelId: 'Masyarakat / Sosiologi' },
  { value: 'leaf', labelEn: 'Leaf / Nature & Entrepreneurship (PKWU)', labelId: 'Daun / Lingkungan & Prakarya (PKWU)' },
  { value: 'sparkles', labelEn: 'Sparkles / Character & Religious Studies', labelId: 'Bintang / Agama & Budi Pekerti' },
] as const

export const SUBJECT_COLOR_OPTIONS = [
  { value: 'blue' as const, labelEn: 'Sky Blue (Matematika / Umum)', labelId: 'Biru Cerah (Sky Blue)' },
  { value: 'green' as const, labelEn: 'Emerald Green (IPA / Biologi)', labelId: 'Hijau (Emerald)' },
  { value: 'amber' as const, labelEn: 'Amber Yellow (IPS / Sejarah)', labelId: 'Kuning Amber (Sejarah / IPS)' },
  { value: 'rose' as const, labelEn: 'Rose Red (Bahasa Indonesia)', labelId: 'Merah Muda / Rose' },
  { value: 'purple' as const, labelEn: 'Purple (Bahasa Asing / Sastra)', labelId: 'Ungu (Bahasa Asing)' },
  { value: 'cyan' as const, labelEn: 'Cyan / Teal (Informatika / Sains)', labelId: 'Sian (Informatika / TIK)' },
  { value: 'orange' as const, labelEn: 'Orange (Fisika / Energi)', labelId: 'Oranye (Fisika / Energi)' },
  { value: 'indigo' as const, labelEn: 'Indigo (Kimia / Teknologi)', labelId: 'Nila / Indigo' },
  { value: 'teal' as const, labelEn: 'Teal (Geografi / Kelautan)', labelId: 'Hijau Laut (Teal)' },
  { value: 'red' as const, labelEn: 'Crimson Red (Pancasila & PPKn)', labelId: 'Merah Tua (PPKn / Pancasila)' },
  { value: 'lime' as const, labelEn: 'Lime Green (Prakarya & PKWU)', labelId: 'Hijau Muda (Prakarya / PKWU)' },
  { value: 'pink' as const, labelEn: 'Pink (Kesenian & Musik)', labelId: 'Merah Muda Terang (Pink)' },
] as const
