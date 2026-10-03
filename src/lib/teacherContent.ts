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

const STORAGE_KEY = 'questly_teacher_curriculum_v1'
const colors = ['blue', 'green', 'rose', 'amber', 'purple', 'cyan']
const nodeStatuses = ['locked', 'current', 'completed']
const chapterStatuses = ['completed', 'in_progress', 'locked']

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOption(value: unknown): value is CurriculumOption {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.text === 'string'
    && typeof value.isCorrect === 'boolean'
}

function isQuestion(value: unknown): value is CurriculumQuestion {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.prompt !== 'string' || !Array.isArray(value.options)) return false
  return value.options.length >= 4
    && value.options.length <= 5
    && value.options.every(isOption)
}

function isNode(value: unknown): value is CurriculumNode {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && (value.type === 'lesson' || value.type === 'quiz')
    && typeof value.status === 'string'
    && nodeStatuses.includes(value.status)
    && (value.contentType === 'text' || value.contentType === 'poster' || value.contentType === 'material')
    && typeof value.content === 'string'
    && typeof value.resourceUrl === 'string'
    && Array.isArray(value.questions)
    && value.questions.every(isQuestion)
    && (value.type !== 'quiz' || value.questions.length > 0)
}

function isChapter(value: unknown): value is CurriculumChapter {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.order === 'number'
    && typeof value.summary === 'string'
    && typeof value.chaptersStatus === 'string'
    && chapterStatuses.includes(value.chaptersStatus)
    && Array.isArray(value.nodes)
    && value.nodes.every(isNode)
}

function isSubject(value: unknown): value is CurriculumSubject {
  return isObject(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.grade === 'number'
    && typeof value.icon === 'string'
    && typeof value.color === 'string'
    && colors.includes(value.color)
    && Array.isArray(value.chapters)
    && value.chapters.every(isChapter)
}

const sampleQuestions = (t: (en: string, id: string) => string): CurriculumQuestion[] => [
  {
    id: 'question-1',
    prompt: t('What is the value of 3²?', 'Berapa nilai dari 3²?'),
    options: [
      { id: 'option-1', text: '6', isCorrect: false },
      { id: 'option-2', text: '9', isCorrect: true },
      { id: 'option-3', text: '27', isCorrect: false },
      { id: 'option-4', text: '12', isCorrect: false },
    ],
  },
  {
    id: 'question-2',
    prompt: t('Simplify: x² × x³', 'Sederhanakan: x² × x³'),
    options: [
      { id: 'option-1', text: 'x⁶', isCorrect: false },
      { id: 'option-2', text: 'x⁵', isCorrect: true },
      { id: 'option-3', text: '2x⁵', isCorrect: false },
      { id: 'option-4', text: 'x', isCorrect: false },
    ],
  },
]

export function createDefaultCurriculum(t: (en: string, id: string) => string): CurriculumSubject[] {
  const questions = sampleQuestions(t)
  const chapter = (
    id: string,
    title: string,
    order: number,
    summary: string,
    nodes: CurriculumNode[],
    chaptersStatus: CurriculumChapter['chaptersStatus'] = 'in_progress'
  ): CurriculumChapter => ({ id, title, order, summary, nodes, chaptersStatus })

  const lessonNode = (
    id: string,
    title: string,
    status: CurriculumNode['status'],
    content = t('This material is currently unavailable.', 'Materi ini saat ini tidak tersedia.')
  ): CurriculumNode => ({
    id,
    title,
    type: 'lesson',
    status,
    contentType: 'text',
    content,
    resourceUrl: '',
    questions: [],
  })

  const quizNode = (id: string, title: string, status: CurriculumNode['status']): CurriculumNode => ({
    id,
    title,
    type: 'quiz',
    status,
    contentType: 'text',
    content: '',
    resourceUrl: '',
    questions,
  })

  return [
    {
      id: 'math-1',
      name: t('Mathematics', 'Matematika'),
      grade: 7,
      icon: 'calculator',
      color: 'blue',
      chapters: [
        chapter('ch-1', t('Exponents & Powers', 'Eksponen & Pangkat'), 1, t('Learn the rules of exponents.', 'Pelajari aturan eksponen.'), [
          lessonNode('node-1', t('Base and Exponents', 'Basis dan Eksponen'), 'completed', t(
            'An exponent refers to the number of times a number is multiplied by itself. For example, 2³ means 2 × 2 × 2 = 8.',
            'Eksponen mengacu pada berapa kali suatu angka dikalikan dengan dirinya sendiri. Misalnya, 2³ berarti 2 × 2 × 2 = 8.'
          )),
          quizNode('node-2', t('Exponent Rules Quiz', 'Kuis Aturan Eksponen'), 'completed'),
          quizNode('node-3', t('Logarithm Practice Quiz', 'Kuis Latihan Logaritma'), 'completed'),
          lessonNode('node-4', t('Chapter 1 Summary', 'Ringkasan Bab 1'), 'completed'),
          quizNode('node-5', t('Chapter 1 Final Challenge', 'Tantangan Akhir Bab 1'), 'current'),
          lessonNode('node-6', t('Victory Treasure Chest', 'Peti Harta Kemenangan'), 'locked'),
        ], 'completed'),
        chapter('ch-2', t('Introduction to Logarithms', 'Pengenalan Logaritma'), 2, t('Logarithms are the inverse operation of exponentiation.', 'Logaritma adalah operasi kebalikan dari perpangkatan.'), [
          lessonNode('node-1', t('What is a Logarithm?', 'Apa itu Logaritma?'), 'completed'),
          lessonNode('node-2', t('Logarithmic Form', 'Bentuk Logaritma'), 'current'),
          quizNode('node-3', t('AI Review Checkpoint', 'Ulasan AI'), 'locked'),
          lessonNode('node-4', t('Basic Properties', 'Sifat Dasar'), 'locked'),
          quizNode('node-5', t('Chapter 2 Boss Exam', 'Ujian Bab 2'), 'locked'),
        ]),
        chapter('ch-3', t('Linear Equations in One Variable', 'Persamaan Linear Satu Variabel'), 3, t('Solve equations of the form ax + b = c.', 'Selesaikan persamaan berbentuk ax + b = c.'), [
          lessonNode('node-1', t('Getting Started', 'Memulai'), 'current'),
        ], 'locked'),
      ],
    },
    {
      id: 'science-1',
      name: t('Science & Biology', 'Sains & Biologi'),
      grade: 7,
      icon: 'flask',
      color: 'green',
      chapters: [
        chapter('ch-4', t('Photosynthesis & Plant Energy', 'Fotosintesis & Energi Tumbuhan'), 1, t('How plants turn sunlight into glucose and oxygen.', 'Cara tumbuhan mengubah sinar matahari menjadi glukosa dan oksigen.'), [
          lessonNode('node-1', t('Chloroplasts', 'Kloroplas'), 'completed'),
          lessonNode('node-2', t('Light Reactions', 'Reaksi Terang'), 'current'),
          quizNode('node-3', t('AI Concept Check', 'Cek Konsep AI'), 'locked'),
        ], 'completed'),
        chapter('ch-5', t('Atoms, Elements & Compounds', 'Atom, Unsur & Senyawa'), 2, t('Understand the periodic table and basic chemistry.', 'Pahami tabel periodik dan dasar-dasar kimia.'), [
          lessonNode('node-1', t('Atoms and Elements', 'Atom dan Unsur'), 'current'),
        ], 'locked'),
      ],
    },
  ]
}

function localizedSeedText(savedText: string, defaultEnglish: string, localizedDefault: string): string {
  return savedText === defaultEnglish || savedText === localizedDefault ? localizedDefault : savedText
}

function localizeSeededCurriculum(
  savedCurriculum: CurriculumSubject[],
  localizedDefaults: CurriculumSubject[],
): CurriculumSubject[] {
  const englishDefaults = createDefaultCurriculum((englishText) => englishText)

  return savedCurriculum.map((savedSubject) => {
    const englishSubject = englishDefaults.find((subject) => subject.id === savedSubject.id)
    const localizedSubject = localizedDefaults.find((subject) => subject.id === savedSubject.id)
    if (!englishSubject || !localizedSubject) return savedSubject

    return {
      ...savedSubject,
      name: localizedSeedText(savedSubject.name, englishSubject.name, localizedSubject.name),
      chapters: savedSubject.chapters.map((savedChapter) => {
        const englishChapter = englishSubject.chapters.find((chapter) => chapter.id === savedChapter.id)
        const localizedChapter = localizedSubject.chapters.find((chapter) => chapter.id === savedChapter.id)
        if (!englishChapter || !localizedChapter) return savedChapter

        return {
          ...savedChapter,
          title: localizedSeedText(savedChapter.title, englishChapter.title, localizedChapter.title),
          summary: localizedSeedText(savedChapter.summary, englishChapter.summary, localizedChapter.summary),
          nodes: savedChapter.nodes.map((savedNode) => {
            const englishNode = englishChapter.nodes.find((node) => node.id === savedNode.id)
            const localizedNode = localizedChapter.nodes.find((node) => node.id === savedNode.id)
            if (!englishNode || !localizedNode) return savedNode

            return {
              ...savedNode,
              title: localizedSeedText(savedNode.title, englishNode.title, localizedNode.title),
              content: localizedSeedText(savedNode.content, englishNode.content, localizedNode.content),
              questions: savedNode.questions.map((savedQuestion) => {
                const englishQuestion = englishNode.questions.find((question) => question.id === savedQuestion.id)
                const localizedQuestion = localizedNode.questions.find((question) => question.id === savedQuestion.id)
                if (!englishQuestion || !localizedQuestion) return savedQuestion
                return {
                  ...savedQuestion,
                  prompt: localizedSeedText(savedQuestion.prompt, englishQuestion.prompt, localizedQuestion.prompt),
                }
              }),
            }
          }),
        }
      }),
    }
  })
}

export function readCurriculum(fallback: CurriculumSubject[]): CurriculumSubject[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return fallback
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.every(isSubject)) {
      const normalized: CurriculumSubject[] = parsed.map((subject) => ({
        ...subject,
        grade: subject.grade === 8 || subject.grade === 9 ? subject.grade : 7,
      }))
      return localizeSeededCurriculum(normalized, fallback)
    }
    throw new Error('Stored curriculum does not match the expected subject, chapter, node, and question structure.')
  } catch (error) {
    console.error('Failed to read teacher curriculum from browser storage.', error)
    return fallback
  }
}

export function writeCurriculum(curriculum: CurriculumSubject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(curriculum))
}

export function createCurriculumId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
