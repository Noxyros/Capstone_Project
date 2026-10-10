'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, BookOpen, Check, CheckCircle2, ChevronDown, CircleHelp, FilePlus2,
  FileText, Gamepad2, Gift, GraduationCap, LoaderCircle, LockKeyhole,
  MoveDown, MoveUp, Play, Plus, Save, Sparkles, Swords, Trash2, UploadCloud,
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import {
  createCurriculumId,
  getCurriculumResourceFormat,
  type CurriculumChapter,
  type CurriculumNode,
  type CurriculumQuestion,
  type CurriculumSubmodule,
  type CurriculumSubject,
} from '@/src/lib/teacherContent'
import { loadCurriculum, saveCurriculum } from '@/src/lib/curriculumClient'
import { useAuth } from '@/src/context/AuthContext'
import { getCachedCurriculum } from '@/src/lib/curriculumClient'
import { PdfMaterialPreview } from '@/src/components/shared/PdfMaterialPreview'

const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400'
const labelClass = 'mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-slate-500'

function makeQuestion(): CurriculumQuestion {
  return {
    id: createCurriculumId('question'),
    prompt: '',
    options: Array.from({ length: 4 }, () => ({
      id: createCurriculumId('option'),
      text: '',
      isCorrect: false,
    })),
  }
}

function makeNode(submoduleId: string | null = null): CurriculumNode {
  return {
    id: createCurriculumId('node'),
    submoduleId,
    title: '',
    type: 'lesson',
    status: 'current',
    contentType: 'text',
    content: '',
    resourceUrl: '',
    questions: [makeQuestion()],
  }
}

function makeSubmodule(order: number): CurriculumSubmodule {
  return {
    id: createCurriculumId('submodule'),
    title: '',
    order,
    summary: '',
    isPublished: true,
  }
}

function makeChapter(order: number): CurriculumChapter {
  const submodule = makeSubmodule(1)
  return {
    id: createCurriculumId('chapter'),
    title: '',
    order,
    summary: '',
    chaptersStatus: 'in_progress',
    submodules: [submodule],
    nodes: [makeNode(submodule.id)],
  }
}

function isEmptyChapterDraft(chapter: CurriculumChapter): boolean {
  if (
    chapter.title.trim()
    || chapter.summary.trim()
    || chapter.chaptersStatus !== 'in_progress'
    || chapter.submodules.length !== 1
    || chapter.nodes.length !== 1
  ) return false

  const [submodule] = chapter.submodules
  const [node] = chapter.nodes
  return Boolean(
    submodule
    && !submodule.title.trim()
    && !submodule.summary.trim()
    && submodule.order === 1
    && submodule.isPublished
    && node
    && node.submoduleId === submodule.id
    && !node.title.trim()
    && node.type === 'lesson'
    && node.status === 'current'
    && node.contentType === 'text'
    && !node.content.trim()
    && !node.resourceUrl.trim()
    && node.questions.length === 1
    && !node.questions[0]?.prompt.trim()
    && node.questions[0]?.options.length === 4
    && node.questions[0].options.every((option) => !option.text.trim() && !option.isCorrect)
  )
}

function makeSubject(): CurriculumSubject {
  return {
    id: createCurriculumId('subject'),
    name: '',
    grade: 7,
    icon: 'book',
    color: 'blue',
    chapters: [makeChapter(1)],
  }
}

function getSaveErrorMessage(
  error: unknown,
  t: (english: string, indonesian: string) => string,
): string {
  const message = error instanceof Error ? error.message : ''
  const validationPrefix = 'Curriculum data is invalid: '
  if (!message.startsWith(validationPrefix)) {
    if (message === 'Curriculum contains duplicate subject IDs.' || message === 'Curriculum contains duplicate IDs.') {
      return t(
        'Some curriculum items appear more than once. Refresh the page and try again.',
        'Ada bagian kurikulum yang tercatat lebih dari sekali. Muat ulang halaman, lalu coba lagi.',
      )
    }
    return message || t('Could not save curriculum changes.', 'Tidak dapat menyimpan perubahan kurikulum.')
  }

  const issue = message.slice(validationPrefix.length)
  const subject = issue.match(/subjects\[(\d+)\]/)
  const chapter = issue.match(/chapters\[(\d+)\]/)
  const submodule = issue.match(/submodules\[(\d+)\]/)
  const node = issue.match(/nodes\[(\d+)\]/)
  const question = issue.match(/questions\[(\d+)\]/)
  const option = issue.match(/options\[(\d+)\]/)
  const subjectLabel = subject
    ? t(`Subject ${Number(subject[1]) + 1}`, `Mata pelajaran ${Number(subject[1]) + 1}`)
    : ''
  const location = [
    subjectLabel,
    chapter && t(`Chapter ${Number(chapter[1]) + 1}`, `Bab ${Number(chapter[1]) + 1}`),
    submodule && t(`Submodule ${Number(submodule[1]) + 1}`, `Submodul ${Number(submodule[1]) + 1}`),
    node && t(`Learning step ${Number(node[1]) + 1}`, `Aktivitas belajar ${Number(node[1]) + 1}`),
    question && t(`Question ${Number(question[1]) + 1}`, `Soal ${Number(question[1]) + 1}`),
    option && t(`Answer option ${Number(option[1]) + 1}`, `Pilihan jawaban ${Number(option[1]) + 1}`),
  ].filter(Boolean).join(' → ')
  const field = issue.match(/\.([a-zA-Z]+)(?:\s|$)/)?.[1]
  let problem: string

  if (field === 'name') {
    problem = t('needs a subject name.', 'perlu nama mata pelajaran.')
  } else if (field === 'title') {
    const item = node ? t('learning step title', 'judul aktivitas belajar')
      : submodule ? t('submodule title', 'judul submodul')
        : t('chapter title', 'judul bab')
    problem = t(`needs a ${item}.`, `perlu ${item}.`)
  } else if (field === 'prompt') {
    problem = t('needs a question prompt.', 'perlu teks soal.')
  } else if (field === 'options' && issue.includes('at least one correct answer')) {
    problem = t('needs at least one correct answer.', 'perlu setidaknya satu jawaban benar.')
  } else if (field === 'options') {
    problem = t('needs 4 or 5 answer options.', 'perlu 4 atau 5 pilihan jawaban.')
  } else if (field === 'questions') {
    problem = t('needs at least one question.', 'perlu setidaknya satu soal.')
  } else if (field === 'summary') {
    problem = t('has an invalid or overly long summary.', 'memiliki ringkasan yang tidak valid atau terlalu panjang.')
  } else if (field === 'content') {
    problem = t('has invalid or overly long learning content.', 'memiliki materi belajar yang tidak valid atau terlalu panjang.')
  } else if (field === 'resourceUrl') {
    problem = t('has an invalid or overly long resource link.', 'memiliki tautan materi yang tidak valid atau terlalu panjang.')
  } else if (field === 'grade') {
    problem = t('must use Grade 7, 8, or 9.', 'harus menggunakan kelas 7, 8, atau 9.')
  } else {
    problem = t('has incomplete or invalid information. Check its fields and try again.', 'memiliki data yang belum lengkap atau tidak valid. Periksa kembali isinya, lalu coba lagi.')
  }

  return location
    ? t(`Please check ${location}: it ${problem}`, `Periksa ${location}: bagian ini ${problem}`)
    : t('Some curriculum information is incomplete or invalid. Check the required fields and try again.', 'Ada informasi kurikulum yang belum lengkap atau tidak valid. Periksa kolom wajib, lalu coba lagi.')
}

function isGeneratedChapterDraft(value: unknown): value is GeneratedChapterDraft {
  if (typeof value !== 'object' || value === null) return false
  const draft = value as Record<string, unknown>
  if (
    typeof draft.chapterTitle !== 'string'
    || !draft.chapterTitle.trim()
    || typeof draft.summary !== 'string'
    || !draft.summary.trim()
    || !Array.isArray(draft.nodes)
    || draft.nodes.length < 3
    || draft.nodes.length > 7
  ) return false

  return draft.nodes.every((value) => {
    if (typeof value !== 'object' || value === null) return false
    const node = value as Record<string, unknown>
    if (
      typeof node.title !== 'string'
      || !node.title.trim()
      || (node.type !== 'lesson' && node.type !== 'quiz')
      || typeof node.content !== 'string'
      || !Array.isArray(node.questions)
    ) return false

    return node.questions.every((value) => {
      if (typeof value !== 'object' || value === null) return false
      const question = value as Record<string, unknown>
      return typeof question.prompt === 'string'
        && Boolean(question.prompt.trim())
        && Array.isArray(question.options)
        && question.options.length === 4
        && question.options.every((option) => typeof option === 'string' && Boolean(option.trim()))
        && typeof question.correctIndex === 'number'
        && Number.isInteger(question.correctIndex)
        && question.correctIndex >= 0
        && question.correctIndex < 4
    })
  })
}

type GeneratedQuestionDraft = {
  prompt: string
  options: string[]
  correctIndex: number
}

type GeneratedNodeDraft = {
  title: string
  type: 'lesson' | 'quiz'
  content: string
  questions: GeneratedQuestionDraft[]
}

type GeneratedChapterDraft = {
  chapterTitle: string
  summary: string
  nodes: GeneratedNodeDraft[]
}

export default function TeacherPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const curriculumScope = user?.id ?? 'public'
  const cachedSubjects = getCachedCurriculum('teacher', curriculumScope)
  const initialSubjects = cachedSubjects ?? []
  const [subjects, setSubjects] = useState<CurriculumSubject[]>(initialSubjects)
  const [savedSubjects, setSavedSubjects] = useState<CurriculumSubject[]>(initialSubjects)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [isRoadmapGeneratorOpen, setIsRoadmapGeneratorOpen] = useState(false)
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [materialText, setMaterialText] = useState('')
  const [suggestedChapterTitle, setSuggestedChapterTitle] = useState('')
  const [learningGoal, setLearningGoal] = useState('')
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [generatedDraft, setGeneratedDraft] = useState<{ subjectId: string; draft: GeneratedChapterDraft } | null>(null)
  const [curriculumReady, setCurriculumReady] = useState(cachedSubjects !== null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const materialFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    const cached = getCachedCurriculum('teacher', curriculumScope)
    if (cached !== null) {
      setSubjects(cached)
      setSavedSubjects(cached)
      setSelectedSubjectId(cached[0]?.id ?? '')
      setSelectedChapterId(cached[0]?.chapters[0]?.id ?? '')
      setSelectedSubmoduleId(cached[0]?.chapters[0]?.submodules[0]?.id ?? '')
      setSelectedNodeId(cached[0]?.chapters[0]?.nodes.find((node) =>
        (node.submoduleId ?? '') === (cached[0]?.chapters[0]?.submodules[0]?.id ?? ''))?.id ?? '')
      setCurriculumReady(true)
    } else {
      setCurriculumReady(false)
    }

    void loadCurriculum('teacher', curriculumScope)
      .then((initial) => {
        if (!active) return
        setSubjects(initial)
        setSavedSubjects(initial)
        setSelectedSubjectId(initial[0]?.id ?? '')
        setSelectedChapterId(initial[0]?.chapters[0]?.id ?? '')
        setSelectedSubmoduleId(initial[0]?.chapters[0]?.submodules[0]?.id ?? '')
        setSelectedNodeId(initial[0]?.chapters[0]?.nodes.find((node) =>
          (node.submoduleId ?? '') === (initial[0]?.chapters[0]?.submodules[0]?.id ?? ''))?.id ?? '')
      })
      .catch((loadError) => {
        console.error('Failed to load teacher curriculum.', loadError)
        if (active) setError(loadError instanceof Error
          ? loadError.message
          : 'Could not load your curriculum.')
      })
      .finally(() => {
        if (active) setCurriculumReady(true)
      })
    return () => { active = false }
  }, [curriculumScope])

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId)
  const selectedChapter = selectedSubject?.chapters.find((chapter) => chapter.id === selectedChapterId)
  const selectedNodes = selectedChapter?.nodes.filter((node) =>
    (node.submoduleId ?? '') === selectedSubmoduleId) ?? []
  const selectedSubmodule = selectedChapter?.submodules.find((submodule) => submodule.id === selectedSubmoduleId)
  const selectedNode = selectedNodes.find((node) => node.id === selectedNodeId)

  const hasUnsavedChanges = JSON.stringify(subjects) !== JSON.stringify(savedSubjects)

  const updateDraft = (next: CurriculumSubject[]) => {
    setSubjects(next)
    setError('')
  }

  const saveChanges = async () => {
    if (!hasUnsavedChanges || isSaving) return
    setIsSaving(true)
    try {
      await saveCurriculum(subjects)
      setSavedSubjects(subjects)
      setError('')
    } catch (saveError) {
      console.error('Failed to save curriculum changes.', saveError)
      setError(getSaveErrorMessage(saveError, t))
    } finally {
      setIsSaving(false)
    }
  }

  const generateRoadmap = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isGeneratingRoadmap) return
    if (!selectedSubject) {
      setGenerationError(t('Select or add a subject before generating a learning path.', 'Pilih atau tambahkan mata pelajaran sebelum membuat peta belajar.'))
      return
    }
    if ((!materialFile && !materialText.trim()) || (materialFile && materialText.trim())) {
      setGenerationError(t('Choose one source: upload a file or paste text.', 'Pilih satu sumber: unggah file atau tempel teks.'))
      return
    }
    if (!selectedSubject.name.trim()) {
      setGenerationError(t('Add a subject name in Subject details before generating.', 'Isi nama mata pelajaran di bagian Detail mata pelajaran sebelum membuat draf.'))
      return
    }

    setIsGeneratingRoadmap(true)
    setGenerationError('')
    setGeneratedDraft(null)
    const formData = new FormData()
    formData.set('subjectName', selectedSubject.name)
    formData.set('grade', String(selectedSubject.grade))
    formData.set('chapterTitle', suggestedChapterTitle)
    formData.set('learningGoal', learningGoal)
    formData.set('language', 'id')
    formData.set('materialText', materialText)
    if (materialFile) formData.set('file', materialFile)

    try {
      const response = await fetch('/api/roadmap/generate', { method: 'POST', body: formData })
      let result: unknown
      try {
        result = await response.json()
      } catch {
        throw new Error(t('The generator returned an unreadable response. Please try again.', 'Generator mengirim respons yang tidak terbaca. Silakan coba lagi.'))
      }

      if (!response.ok) {
        const code = typeof result === 'object' && result !== null && 'code' in result && typeof result.code === 'string'
          ? result.code
          : ''
        const message = code === 'not_configured'
          ? t('The roadmap generator is not set up yet. Please contact your administrator.', 'Generator peta belajar belum disiapkan. Hubungi administrator.')
          : code === 'invalid_api_key'
            ? t('The roadmap generator could not authenticate. Please contact your administrator.', 'Generator peta belajar tidak dapat melakukan autentikasi. Hubungi administrator.')
            : code === 'provider_rate_limited' || code === 'rate_limited' || response.status === 429
              ? t('The generator is busy or at its request limit. Wait a little and try again.', 'Generator sedang sibuk atau mencapai batas permintaan. Tunggu sebentar lalu coba lagi.')
              : code === 'provider_busy'
                ? t('The generator is experiencing high demand. Please try again shortly.', 'Generator sedang ramai digunakan. Silakan coba lagi sebentar lagi.')
              : code === 'file_too_large' || code === 'material_too_large'
                ? t('The source is too large. Choose a file under 12 MB or paste shorter text.', 'Materi terlalu besar. Pilih file di bawah 12 MB atau tempel teks yang lebih singkat.')
                : code === 'unsupported_file'
                  ? t('Use a PDF, text file, or supported image file.', 'Gunakan file PDF, teks, atau gambar yang didukung.')
                  : code === 'invalid_file' || code === 'invalid_text_file' || code === 'invalid_material'
                    ? t('This file could not be read. Check that it is a valid, non-empty PDF, text file, or supported image.', 'File ini tidak dapat dibaca. Pastikan file PDF, teks, atau gambar valid dan tidak kosong.')
                    : code === 'model_unavailable'
                      ? t('The generator is temporarily unavailable. Please contact your administrator.', 'Generator sedang tidak tersedia. Hubungi administrator.')
                      : code === 'provider_request_rejected'
                        ? t('The AI service rejected this request. Try a different or smaller source file.', 'Layanan AI menolak permintaan ini. Coba file sumber lain atau yang lebih kecil.')
                        : code === 'timeout'
                          ? t('Generation took too long. Try a shorter source.', 'Proses terlalu lama. Coba gunakan materi yang lebih singkat.')
                          : code === 'empty_response' || code === 'invalid_response' || code === 'invalid_generated_json' || code === 'invalid_generated_draft'
                            ? t('The generator could not create a complete learning path from this source. Try clearer or shorter material.', 'Generator tidak dapat membuat peta belajar yang lengkap dari materi ini. Coba materi yang lebih jelas atau lebih singkat.')
                            : code === 'connection_error'
                              ? t('Could not connect to the generator. Check your connection and try again.', 'Tidak dapat terhubung ke generator. Periksa koneksi lalu coba lagi.')
                              : code === 'provider_error'
                                ? t('The generator service encountered an error. Please try again shortly.', 'Layanan generator mengalami kendala. Silakan coba lagi nanti.')
                                : t('Could not generate a roadmap from this material. Check the source and try again.', 'Peta belajar tidak dapat dibuat dari materi ini. Periksa sumber lalu coba lagi.')
        throw new Error(message)
      }

      if (typeof result !== 'object' || result === null || !('draft' in result) || !isGeneratedChapterDraft(result.draft)) {
        throw new Error(t('The generator returned an invalid roadmap draft.', 'Generator mengirim draf peta belajar yang tidak valid.'))
      }

      setGeneratedDraft({ subjectId: selectedSubject.id, draft: result.draft })
    } catch (caught) {
      setGenerationError(caught instanceof Error ? caught.message : t('Roadmap generation failed. Please try again.', 'Pembuatan peta belajar gagal. Silakan coba lagi.'))
    } finally {
      setIsGeneratingRoadmap(false)
    }
  }

  const addGeneratedChapter = () => {
    if (!generatedDraft || generatedDraft.subjectId !== selectedSubject?.id || !selectedSubject) return

    const existingChapters = selectedSubject.chapters.filter((chapter) => !isEmptyChapterDraft(chapter))
    const submodule = makeSubmodule(1)
    const chapter: CurriculumChapter = {
      id: createCurriculumId('chapter'),
      title: generatedDraft.draft.chapterTitle,
      order: Math.max(0, ...existingChapters.map((item) => item.order)) + 1,
      summary: generatedDraft.draft.summary,
      chaptersStatus: 'in_progress',
      submodules: [{ ...submodule, title: generatedDraft.draft.chapterTitle }],
      nodes: generatedDraft.draft.nodes.map((node) => ({
        id: createCurriculumId('node'),
        submoduleId: submodule.id,
        title: node.title,
        type: node.type,
        status: 'current',
        contentType: 'text',
        content: node.type === 'lesson' ? node.content : '',
        resourceUrl: '',
        questions: node.questions.map((question) => ({
          id: createCurriculumId('question'),
          prompt: question.prompt,
          options: question.options.map((text, index) => ({
            id: createCurriculumId('option'),
            text,
            isCorrect: index === question.correctIndex,
          })),
        })),
      })),
    }

    updateSubject(selectedSubject.id, (subject) => ({
      ...subject,
      chapters: [...subject.chapters.filter((item) => !isEmptyChapterDraft(item)), chapter],
    }))
    setSelectedChapterId(chapter.id)
    setSelectedSubmoduleId(submodule.id)
    setSelectedNodeId(chapter.nodes[0]?.id ?? '')
    setGeneratedDraft(null)
    setMaterialFile(null)
    setMaterialText('')
    setSuggestedChapterTitle('')
    setLearningGoal('')
    setGenerationError('')
    setIsPreview(false)
  }

  const updateSubject = (subjectId: string, update: (subject: CurriculumSubject) => CurriculumSubject) => {
    updateDraft(subjects.map((subject) => subject.id === subjectId ? update(subject) : subject))
  }

  const updateChapter = (
    subjectId: string,
    chapterId: string,
    update: (chapter: CurriculumChapter) => CurriculumChapter
  ) => {
    updateSubject(subjectId, (subject) => ({
      ...subject,
      chapters: subject.chapters.map((chapter) => chapter.id === chapterId ? update(chapter) : chapter),
    }))
  }

  const updateNode = (
    subjectId: string,
    chapterId: string,
    nodeId: string,
    update: (node: CurriculumNode) => CurriculumNode
  ) => {
    updateChapter(subjectId, chapterId, (chapter) => ({
      ...chapter,
      nodes: chapter.nodes.map((node) => node.id === nodeId ? update(node) : node),
    }))
  }

  const addSubject = () => {
    const subject = makeSubject()
    updateDraft([...subjects, subject])
    setSelectedSubjectId(subject.id)
    setSelectedChapterId(subject.chapters[0].id)
    setSelectedSubmoduleId(subject.chapters[0].submodules[0].id)
    setSelectedNodeId(subject.chapters[0].nodes[0].id)
  }

  const addChapter = () => {
    if (!selectedSubject) return
    const chapter = makeChapter(selectedSubject.chapters.length + 1)
    updateSubject(selectedSubject.id, (subject) => ({ ...subject, chapters: [...subject.chapters, chapter] }))
    setSelectedChapterId(chapter.id)
    setSelectedSubmoduleId(chapter.submodules[0].id)
    setSelectedNodeId(chapter.nodes[0].id)
  }

  const addSubmodule = () => {
    if (!selectedSubject || !selectedChapter) return
    const order = Math.max(0, ...selectedChapter.submodules.map((submodule) => submodule.order)) + 1
    const submodule = makeSubmodule(order)
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({
      ...chapter,
      submodules: [...chapter.submodules, submodule],
    }))
    setSelectedSubmoduleId(submodule.id)
    setSelectedNodeId('')
  }

  const updateSubmodule = (submoduleId: string, update: (submodule: CurriculumSubmodule) => CurriculumSubmodule) => {
    if (!selectedSubject || !selectedChapter) return
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({
      ...chapter,
      submodules: chapter.submodules.map((submodule) => submodule.id === submoduleId ? update(submodule) : submodule),
    }))
  }

  const addNode = () => {
    if (!selectedSubject || !selectedChapter || !selectedSubmodule) return
    const node = makeNode(selectedSubmodule.id)
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, nodes: [...chapter.nodes, node] }))
    setSelectedNodeId(node.id)
  }

  const moveSelectedNode = (direction: -1 | 1) => {
    if (!selectedSubject || !selectedChapter || !selectedNode) return
    const submoduleIndex = selectedNodes.findIndex((node) => node.id === selectedNode.id)
    const targetNode = selectedNodes[submoduleIndex + direction]
    if (!targetNode) return
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => {
      const nodes = [...chapter.nodes]
      const currentIndex = nodes.findIndex((node) => node.id === selectedNode.id)
      const targetIndex = nodes.findIndex((node) => node.id === targetNode.id)
      ;[nodes[currentIndex], nodes[targetIndex]] = [nodes[targetIndex]!, nodes[currentIndex]!]
      return { ...chapter, nodes }
    })
  }

  const deleteSubject = () => {
    if (!selectedSubject || !window.confirm(t(`Delete "${selectedSubject.name}" and all its chapters?`, `Hapus "${selectedSubject.name}" dan semua babnya?`))) return
    const next = subjects.filter((subject) => subject.id !== selectedSubject.id)
    updateDraft(next)
    setSelectedSubjectId(next[0]?.id ?? '')
    setSelectedChapterId(next[0]?.chapters[0]?.id ?? '')
    setSelectedSubmoduleId(next[0]?.chapters[0]?.submodules[0]?.id ?? '')
    setSelectedNodeId(next[0]?.chapters[0]?.nodes[0]?.id ?? '')
  }

  const deleteChapter = () => {
    if (!selectedSubject || !selectedChapter || !window.confirm(t(`Delete "${selectedChapter.title}" and its roadmap?`, `Hapus "${selectedChapter.title}" dan petanya?`))) return
    const chapters = selectedSubject.chapters.filter((chapter) => chapter.id !== selectedChapter.id)
    updateSubject(selectedSubject.id, (subject) => ({ ...subject, chapters }))
    setSelectedChapterId(chapters[0]?.id ?? '')
    setSelectedSubmoduleId(chapters[0]?.submodules[0]?.id ?? '')
    setSelectedNodeId(chapters[0]?.nodes[0]?.id ?? '')
  }

  const deleteNode = () => {
    if (!selectedSubject || !selectedChapter || !selectedNode || !window.confirm(t(`Delete "${selectedNode.title}"?`, `Hapus "${selectedNode.title}"?`))) return
    const nodes = selectedChapter.nodes.filter((node) => node.id !== selectedNode.id)
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, nodes }))
    setSelectedNodeId(nodes.find((node) => (node.submoduleId ?? '') === selectedSubmoduleId)?.id ?? '')
  }

  const addQuestion = () => {
    if (!selectedSubject || !selectedChapter || !selectedNode) return
    updateNode(selectedSubject.id, selectedChapter.id, selectedNode.id, (node) => ({
      ...node,
      questions: [...node.questions, makeQuestion()],
    }))
  }

  const updateQuestion = (questionId: string, update: (question: CurriculumQuestion) => CurriculumQuestion) => {
    if (!selectedSubject || !selectedChapter || !selectedNode) return
    updateNode(selectedSubject.id, selectedChapter.id, selectedNode.id, (node) => ({
      ...node,
      questions: node.questions.map((question) => question.id === questionId ? update(question) : question),
    }))
  }

  const setNodeType = (type: CurriculumNode['type']) => {
    if (!selectedSubject || !selectedChapter || !selectedNode) return
    updateNode(selectedSubject.id, selectedChapter.id, selectedNode.id, (node) => ({
      ...node,
      type,
      questions: type === 'treasure'
        ? []
        : (type === 'quiz' || type === 'boss') && node.questions.length === 0 ? [makeQuestion()] : node.questions,
      rewardCurrency: type === 'treasure' ? node.rewardCurrency ?? 'xp' : undefined,
      rewardAmount: type === 'treasure' ? node.rewardAmount ?? 10 : undefined,
    }))
  }

  if (!curriculumReady) {
    return <p role="status" className="p-6 text-center font-bold text-slate-500">{t('Loading curriculum…', 'Memuat kurikulum…')}</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-24">
      <header>
        <div>
          <div className="flex items-center gap-2 text-indigo-600">
            <GraduationCap className="h-6 w-6" />
            <span className="text-xs font-extrabold uppercase tracking-widest">{t('Teacher workspace', 'Ruang kerja guru')}</span>
          </div>
          <h1 className="mt-1 text-3xl font-black text-slate-800">{t('Curriculum Studio', 'Studio Kurikulum')}</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {t('Build subjects, chapters, roadmaps, lessons, and quizzes.', 'Buat mata pelajaran, bab, peta belajar, materi, dan kuis.')}
          </p>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-4">
        <section className="overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white shadow-sm">
          <button
            type="button"
            aria-expanded={isRoadmapGeneratorOpen}
            onClick={() => setIsRoadmapGeneratorOpen((open) => !open)}
            disabled={isGeneratingRoadmap}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-indigo-200 disabled:cursor-wait sm:p-5"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-slate-800">{t('Create a learning path', 'Buat peta belajar')}</span>
              <span className="mt-0.5 block text-sm font-semibold text-slate-500">
                {t('Turn your notes, PDFs, or images into an outcome-led chapter with lessons and quizzes.', 'Ubah catatan, PDF, atau gambar menjadi bab berorientasi capaian dengan pelajaran dan kuis.')}
              </span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-indigo-500 transition-transform ${isRoadmapGeneratorOpen ? 'rotate-180' : ''}`} />
          </button>

          {isRoadmapGeneratorOpen && (
            <div className="border-t-2 border-indigo-100 bg-slate-50/70 p-4 sm:p-5">
              <form onSubmit={generateRoadmap} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>{t('Chapter title (optional)', 'Judul bab (opsional)')}</span>
                    <input
                      className={inputClass}
                      value={suggestedChapterTitle}
                      onChange={(event) => setSuggestedChapterTitle(event.target.value)}
                      maxLength={160}
                      placeholder={t('Suggest a title or leave blank', 'Sarankan judul atau kosongkan')}
                      disabled={isGeneratingRoadmap}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>{t('Learning goal (optional)', 'Tujuan belajar (opsional)')}</span>
                    <input
                      className={inputClass}
                      value={learningGoal}
                      onChange={(event) => setLearningGoal(event.target.value)}
                      maxLength={1_000}
                      placeholder={t('What should students learn?', 'Apa yang harus dipelajari siswa?')}
                      disabled={isGeneratingRoadmap}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <label className="flex min-w-0 flex-col">
                    <span className={labelClass}>{t('Paste source material', 'Tempel materi sumber')}</span>
                    <textarea
                      className={`${inputClass} min-h-32 resize-y leading-relaxed`}
                      value={materialText}
                      onChange={(event) => {
                        setMaterialText(event.target.value)
                        if (event.target.value) {
                          setMaterialFile(null)
                          if (materialFileInputRef.current) materialFileInputRef.current.value = ''
                        }
                        setGenerationError('')
                        setGeneratedDraft(null)
                      }}
                      maxLength={120_000}
                      placeholder={t('Paste lesson notes or textbook excerpts...', 'Tempel catatan pelajaran atau kutipan buku...')}
                      disabled={isGeneratingRoadmap}
                    />
                  </label>
                  <div className="flex min-w-0 flex-col">
                    <label htmlFor="roadmap-source-file" className={labelClass}>{t('Upload a source file', 'Unggah file sumber')}</label>
                    <div className="flex min-h-20 items-center rounded-xl border-2 border-slate-200 bg-white p-3 transition-colors hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 sm:p-4">
                      <input
                        id="roadmap-source-file"
                        ref={materialFileInputRef}
                        type="file"
                        accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,text/plain,image/jpeg,image/png,image/webp,image/heic,image/heif"
                        disabled={isGeneratingRoadmap}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null
                          if (file && file.size > 12 * 1024 * 1024) {
                            setMaterialFile(null)
                            event.target.value = ''
                            setGenerationError(t('Files must be 12 MB or smaller.', 'Ukuran file maksimal 12 MB.'))
                            setGeneratedDraft(null)
                            return
                          }
                          setMaterialFile(file)
                          if (file) setMaterialText('')
                          setGenerationError('')
                          setGeneratedDraft(null)
                        }}
                        className="sr-only"
                      />
                      {materialFile ? (
                        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                            <FileText className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold text-slate-700">{materialFile.name}</span>
                            <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                              {`${(materialFile.size / (1024 * 1024)).toFixed(1)} MB`}
                            </span>
                          </span>
                          <span className="ml-auto flex shrink-0 items-center gap-3">
                            <button
                              type="button"
                              onClick={() => materialFileInputRef.current?.click()}
                              disabled={isGeneratingRoadmap}
                              className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            >
                              {t('Change file', 'Ganti file')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMaterialFile(null)
                                if (materialFileInputRef.current) materialFileInputRef.current.value = ''
                              }}
                              disabled={isGeneratingRoadmap}
                              className="text-xs font-bold text-slate-500 hover:text-rose-600 disabled:opacity-50"
                            >
                              {t('Remove', 'Hapus')}
                            </button>
                          </span>
                        </div>
                      ) : (
                        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:flex-nowrap">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                            <UploadCloud className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-extrabold text-slate-700">{t('Add a source file', 'Tambahkan file sumber')}</span>
                            <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                              {t('PDF, text, or image · up to 12 MB', 'PDF, teks, atau gambar · maksimal 12 MB')}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => materialFileInputRef.current?.click()}
                            disabled={isGeneratingRoadmap}
                            className="ml-auto shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-indigo-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:opacity-50"
                          >
                            {t('Choose file', 'Pilih file')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold leading-relaxed text-slate-500">
                  {t('Your material is processed by an external AI service. Avoid confidential or student-identifying information.', 'Materi diproses oleh layanan AI eksternal. Hindari informasi rahasia atau data yang dapat mengidentifikasi siswa.')}
                </p>
                {generationError && <p role="alert" className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{generationError}</p>}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500">
                    {t('Review the draft before adding it to your curriculum.', 'Tinjau draf sebelum menambahkannya ke kurikulum.')}
                  </p>
                  <button
                    type="submit"
                    disabled={isGeneratingRoadmap}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
                  >
                    {isGeneratingRoadmap ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {isGeneratingRoadmap ? t('Building your draft…', 'Menyusun draf…') : t('Generate draft', 'Buat draf')}
                  </button>
                </div>
              </form>

              {generatedDraft && generatedDraft.subjectId === selectedSubject?.id && (
                <GeneratedRoadmapReview
                  draft={generatedDraft.draft}
                  onAdd={addGeneratedChapter}
                  onDiscard={() => setGeneratedDraft(null)}
                  t={t}
                />
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 sm:max-w-xl">
              <span className={labelClass}>{t('Select subject', 'Pilih mata pelajaran')}</span>
              <select
                className={inputClass}
                value={selectedSubject?.id ?? ''}
                disabled={isGeneratingRoadmap}
                onChange={(event) => {
                  const subject = subjects.find((item) => item.id === event.target.value)
                  const chapter = subject?.chapters[0]
                  const submoduleId = chapter?.submodules[0]?.id ?? ''
                  setSelectedSubjectId(subject?.id ?? '')
                  setSelectedChapterId(chapter?.id ?? '')
                  setSelectedSubmoduleId(submoduleId)
                  setSelectedNodeId(chapter?.nodes.find((node) =>
                    (node.submoduleId ?? '') === submoduleId)?.id ?? '')
                  setGeneratedDraft(null)
                  setGenerationError('')
                }}
              >
                {subjects.length === 0 && <option value="">{t('No subjects yet', 'Belum ada mata pelajaran')}</option>}
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name || t('Untitled subject', 'Mata pelajaran tanpa judul')}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={addSubject} className="inline-flex items-center gap-2 rounded-xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> {t('Add subject', 'Tambah mata pelajaran')}
            </button>
          </div>
        </section>

        {selectedSubject ? (
          <section className="min-w-0 space-y-4">
            <section className="rounded-3xl border-2 border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-extrabold text-slate-700">{t('Subject details', 'Detail mata pelajaran')}</h2>
                <button type="button" onClick={deleteSubject} aria-label={t('Delete subject', 'Hapus mata pelajaran')} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label><span className={labelClass}>{t('Subject name', 'Nama mata pelajaran')}</span>
                  <input
                    className={inputClass}
                    value={selectedSubject.name}
                    onChange={(event) => {
                      updateSubject(selectedSubject.id, (subject) => ({ ...subject, name: event.target.value }))
                      setGenerationError('')
                    }}
                    placeholder={t('e.g. Mathematics', 'mis. Matematika')}
                  />
                </label>
                <label><span className={labelClass}>{t('Grade', 'Kelas')}</span>
                  <select className={inputClass} value={selectedSubject.grade} onChange={(event) => updateSubject(selectedSubject.id, (subject) => ({ ...subject, grade: Number(event.target.value) as CurriculumSubject['grade'] }))}>
                    {[7, 8, 9].map((grade) => <option key={grade} value={grade}>{t(`Grade ${grade}`, `Kelas ${grade}`)}</option>)}
                  </select>
                </label>
                <label><span className={labelClass}>{t('Icon', 'Ikon')}</span>
                  <select className={inputClass} value={selectedSubject.icon} onChange={(event) => updateSubject(selectedSubject.id, (subject) => ({ ...subject, icon: event.target.value }))}>
                    <option value="book">{t('Book', 'Buku')}</option><option value="calculator">{t('Calculator', 'Kalkulator')}</option><option value="flask">{t('Science flask', 'Labu sains')}</option><option value="globe">{t('Globe', 'Globe')}</option>
                  </select>
                </label>
                <label><span className={labelClass}>{t('Card color', 'Warna kartu')}</span>
                  <select className={inputClass} value={selectedSubject.color} onChange={(event) => updateSubject(selectedSubject.id, (subject) => ({ ...subject, color: event.target.value as CurriculumSubject['color'] }))}>
                    {(['blue', 'green', 'rose', 'amber', 'purple', 'cyan'] as const).map((color) => <option key={color} value={color}>{t(color, color)}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-3xl border-2 border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-extrabold text-slate-700">{t('Chapters and roadmaps', 'Bab dan peta belajar')}</h2>
                <button type="button" onClick={addChapter} className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-extrabold text-indigo-700 hover:bg-indigo-100">
                  <Plus className="h-4 w-4" /> {t('Add chapter', 'Tambah bab')}
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label><span className={labelClass}>{t('Select chapter', 'Pilih bab')}</span>
                  <select
                    className={inputClass}
                    value={selectedChapter?.id ?? ''}
                    onChange={(event) => {
                      const chapter = selectedSubject.chapters.find((item) => item.id === event.target.value)
                      setSelectedChapterId(chapter?.id ?? '')
                      setSelectedSubmoduleId(chapter?.submodules[0]?.id ?? '')
                      setSelectedNodeId(chapter?.nodes.find((node) =>
                        (node.submoduleId ?? '') === (chapter?.submodules[0]?.id ?? ''))?.id ?? '')
                    }}
                  >
                    {selectedSubject.chapters.length === 0 && <option value="">{t('No chapters yet', 'Belum ada bab')}</option>}
                    {selectedSubject.chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>{chapter.title || t('Untitled chapter', 'Bab tanpa judul')}</option>
                    ))}
                  </select>
                </label>
                {selectedChapter && <span className="pb-2 text-xs font-bold text-slate-400">{selectedChapter.submodules.length} {t('submodules', 'submodul')}</span>}
              </div>
            </section>

            {selectedChapter && (
              <section className="space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-extrabold text-slate-700">{t('Chapter and roadmap editor', 'Editor bab dan peta')}</h2>
                  <button type="button" onClick={deleteChapter} aria-label={t('Delete chapter', 'Hapus bab')} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-5 w-5" /></button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className={labelClass}>{t('Chapter title', 'Judul bab')}</span>
                    <input className={inputClass} value={selectedChapter.title} onChange={(event) => updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, title: event.target.value }))} />
                  </label>
                  <label><span className={labelClass}>{t('Student access', 'Akses siswa')}</span>
                    <select className={inputClass} value={selectedChapter.chaptersStatus} onChange={(event) => updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, chaptersStatus: event.target.value as CurriculumChapter['chaptersStatus'] }))}>
                      <option value="in_progress">{t('Available', 'Tersedia')}</option><option value="completed">{t('Review', 'Ulasan')}</option><option value="locked">{t('Locked', 'Terkunci')}</option>
                    </select>
                  </label>
                </div>

                <div className="border-t-2 border-slate-100 pt-5">
                <div className="focus-submodule-panel mb-5 grid gap-3 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label>
                    <span className={labelClass}>{t('Focus submodule', 'Pilih submodul')}</span>
                    <select
                      className={inputClass}
                      value={selectedSubmoduleId}
                      onChange={(event) => {
                        const submoduleId = event.target.value
                        setSelectedSubmoduleId(submoduleId)
                        setSelectedNodeId(selectedChapter.nodes.find((node) =>
                          (node.submoduleId ?? '') === submoduleId)?.id ?? '')
                      }}
                    >
                      {selectedChapter.submodules.map((submodule) => (
                        <option key={submodule.id} value={submodule.id}>{submodule.title || t('Untitled submodule', 'Submodul tanpa judul')}</option>
                      ))}
                    </select>
                  </label>
                  {!isPreview && (
                    <button type="button" onClick={addSubmodule} className="inline-flex items-center justify-center gap-1 rounded-xl bg-white px-3 py-2.5 text-sm font-extrabold text-indigo-700 ring-2 ring-indigo-100 hover:bg-indigo-50">
                      <Plus className="h-4 w-4" /> {t('Add submodule', 'Tambah submodul')}
                    </button>
                  )}
                  {selectedSubmodule && !isPreview && (
                    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                      <label>
                        <span className={labelClass}>{t('Submodule title', 'Judul submodul')}</span>
                        <input
                          className={inputClass}
                          value={selectedSubmodule.title}
                          onChange={(event) => updateSubmodule(selectedSubmodule.id, (item) => ({ ...item, title: event.target.value }))}
                        />
                      </label>
                    </div>
                  )}
                </div>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-slate-700">{t('Learning path', 'Peta belajar')}</h3>
                    <p className="text-xs font-semibold text-slate-400">{t('Select a step to edit it, or preview the learner experience.', 'Pilih langkah untuk mengedit atau melihat pengalaman siswa.')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPreview((preview) => !preview)}
                      aria-pressed={isPreview}
                      className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition-colors ${isPreview ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Play className="h-4 w-4" />
                      {isPreview ? t('Exit preview', 'Keluar dari pratinjau') : t('Preview as learner', 'Pratinjau sebagai siswa')}
                    </button>
                    {!isPreview && selectedSubmodule && (
                      <button type="button" onClick={addNode} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-indigo-700">
                        <Plus className="h-4 w-4" /> {t('Add step', 'Tambah langkah')}
                      </button>
                    )}
                  </div>
                </div>

                {selectedNodes.length > 0 ? (
                  <div role="list" aria-label={t('Chapter learning path', 'Peta belajar bab')} className="mx-auto flex max-w-md flex-col items-center py-2">
                    {selectedNodes.map((node, index) => {
                      const isSelected = node.id === selectedNode?.id
                      const NodeIcon = node.type === 'boss' ? Swords : node.type === 'quiz' ? Gamepad2 : node.type === 'treasure' ? Gift : FileText
                      const statusLabel = node.status === 'completed'
                        ? t('Completed', 'Selesai')
                        : node.status === 'locked'
                          ? t('Locked', 'Terkunci')
                          : t('Available', 'Tersedia')
                      const statusClass = node.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : node.status === 'locked'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-indigo-50 text-indigo-700'

                      const isLeft = index % 2 === 0
                      const strokeColorClass = node.status === 'completed' ? 'text-sky-400' : 'text-slate-200'

                      return (
                        <React.Fragment key={node.id}>
                          <div role="listitem" className="relative z-10 flex w-full flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setSelectedNodeId(node.id)}
                          aria-current={isSelected ? 'step' : undefined}
                          className={`relative flex w-[260px] items-center gap-3 rounded-2xl border-[3px] bg-white p-3 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 sm:w-[320px] sm:gap-4 sm:p-4 ${isLeft ? '-translate-x-6 sm:-translate-x-8' : 'translate-x-6 sm:translate-x-8'} ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-100' : node.status === 'completed' ? 'border-emerald-200' : node.status === 'locked' ? 'border-slate-200' : 'border-slate-100'}`}
                        >
                            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${node.type === 'boss' ? 'bg-rose-600' : node.type === 'quiz' ? 'bg-violet-500' : node.type === 'treasure' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                              {node.status === 'completed'
                                ? <CheckCircle2 className="h-6 w-6" />
                                : node.status === 'locked'
                                  ? <LockKeyhole className="h-5 w-5" />
                                  : <NodeIcon className="h-6 w-6" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  {node.type === 'boss' ? t('Final boss', 'Bos akhir') : node.type === 'quiz' ? t('Quiz', 'Kuis') : node.type === 'treasure' ? t('Treasure', 'Harta') : t('Lesson', 'Pelajaran')}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusClass}`}>{statusLabel}</span>
                              </span>
                              {node.title && (
                                <span className="mt-1 block truncate text-sm font-extrabold text-slate-700">
                                  {node.title}
                                </span>
                              )}
                            </span>
                        </button>
                          </div>
                          {index < selectedNodes.length - 1 && (
                            <div aria-hidden="true" className={`relative z-0 -my-1 flex h-16 w-full justify-center pointer-events-none sm:h-20 ${strokeColorClass}`}>
                              <svg width="200" height="64" viewBox="0 0 200 64" className={`overflow-visible sm:hidden block ${strokeColorClass}`}>
                                <path d={isLeft ? 'M 76 0 V 16 Q 76 32 86 32 H 114 Q 124 32 124 48 V 64' : 'M 124 0 V 16 Q 124 32 114 32 H 86 Q 76 32 76 48 V 64'} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <svg width="320" height="80" viewBox="0 0 320 80" className={`overflow-visible hidden sm:block ${strokeColorClass}`}>
                                <path d={isLeft ? 'M 128 0 V 20 Q 128 40 148 40 H 172 Q 192 40 192 60 V 80' : 'M 192 0 V 20 Q 192 40 172 40 H 148 Q 128 40 128 60 V 80'} fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <CircleHelp className="mx-auto h-7 w-7 text-slate-400" />
                    <p className="mt-2 text-sm font-bold text-slate-500">{t('This chapter has no learning steps yet.', 'Bab ini belum memiliki langkah belajar.')}</p>
                    {!isPreview && selectedSubmodule && <button type="button" onClick={addNode} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white">{t('Add the first step', 'Tambah langkah pertama')}</button>}
                  </div>
                )}
                </div>

                {selectedNode ? (
                  isPreview ? (
                    <NodePreview node={selectedNode} t={t} />
                  ) : (
                    <NodeEditor
                      key={selectedNode.id}
                      node={selectedNode}
                      updateNode={(update) => updateNode(selectedSubject.id, selectedChapter.id, selectedNode.id, update)}
                      onTypeChange={setNodeType}
                      onMove={moveSelectedNode}
                      nodeIndex={selectedNodes.findIndex((node) => node.id === selectedNode.id)}
                      nodeCount={selectedNodes.length}
                      onDelete={deleteNode}
                      onAddQuestion={addQuestion}
                      onUpdateQuestion={updateQuestion}
                      t={t}
                    />
                  )
                ) : !isPreview ? (
                  <p className="rounded-xl bg-slate-50 p-5 text-center font-bold text-slate-400">{t('Add a node to this roadmap.', 'Tambahkan node ke peta ini.')}</p>
                ) : null}
              </section>
            )}
          </section>
        ) : subjects.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 p-10 text-center font-bold text-slate-500">
            {t('Create a subject to start building its curriculum.', 'Buat mata pelajaran untuk mulai menyusun kurikulum.')}
          </div>
        ) : null}
      </div>
      <div className="flex justify-end rounded-2xl border-2 border-slate-200 bg-white p-3 sm:p-4">
        <button
          type="button"
          onClick={saveChanges}
          disabled={!hasUnsavedChanges || isSaving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-5 py-3 font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200 sm:w-auto"
        >
          {isSaving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : hasUnsavedChanges ? <Save className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          {isSaving ? t('Saving…', 'Menyimpan…') : hasUnsavedChanges ? t('Save changes', 'Simpan perubahan') : t('Saved', 'Tersimpan')}
        </button>
      </div>
      <p className="text-center text-xs font-semibold text-slate-400">
        {t('Saved changes are visible to learners when published.', 'Perubahan yang disimpan akan terlihat oleh siswa setelah dipublikasikan.')}
      </p>
    </div>
  )
}

function NodePreview({ node, t }: {
  node: CurriculumNode
  t: (en: string, id: string) => string
}) {
  const resourceFormat = getCurriculumResourceFormat(node.resourceUrl)

  return (
    <section aria-label={t('Learner preview', 'Pratinjau siswa')} className="rounded-3xl border-2 border-indigo-100 bg-indigo-50/60 p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-indigo-700">
        <Play className="h-4 w-4" />
        <h3 className="text-xs font-extrabold uppercase tracking-wider">{t('Learner preview', 'Pratinjau siswa')}</h3>
      </div>
      <div className="rounded-2xl border-2 border-slate-100 bg-white p-5 sm:p-6">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-indigo-500">
          {node.type === 'boss' ? t('Final boss', 'Bos akhir') : node.type === 'quiz' ? t('Quiz', 'Kuis') : node.type === 'treasure' ? t('Treasure', 'Harta') : t('Lesson', 'Pelajaran')}
        </span>
        {node.title && <h4 className="mt-1 text-xl font-extrabold text-slate-800">{node.title}</h4>}
        {node.type === 'lesson' ? (
          <div className="mt-4">
            {node.resourceUrl && (node.contentType === 'poster' || resourceFormat === 'image') ? (
              <img src={node.resourceUrl} alt={node.title} className="max-h-80 w-full rounded-xl object-contain" />
            ) : node.contentType === 'material' && node.resourceUrl && resourceFormat === 'pdf' ? (
              <PdfMaterialPreview
                src={node.resourceUrl}
                title={t('PDF material preview', 'Pratinjau materi PDF')}
                t={t}
              />
            ) : node.contentType === 'material' && node.resourceUrl && resourceFormat !== 'presentation' ? (
              <iframe
                src={node.resourceUrl}
                title={resourceFormat === 'pdf' ? t('PDF material preview', 'Pratinjau materi PDF') : t('Learning material preview', 'Pratinjau materi belajar')}
                className="h-[60vh] min-h-80 w-full rounded-xl border-2 border-slate-200 bg-slate-50"
              />
            ) : node.contentType === 'material' && node.resourceUrl && resourceFormat === 'presentation' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-600">{t('PowerPoint files cannot be previewed here.', 'File PowerPoint tidak dapat dipratinjau di sini.')}</p>
                <a href={node.resourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 font-bold text-indigo-700 underline underline-offset-2">
                  <BookOpen className="h-4 w-4" /> {t('Open PowerPoint file', 'Buka file PowerPoint')}
                </a>
              </div>
            ) : (
              <p className="select-text whitespace-pre-line text-sm font-medium leading-relaxed text-slate-700">
                {node.content || t('Lesson text will appear here once added.', 'Teks pelajaran akan tampil di sini setelah ditambahkan.')}
              </p>
            )}
          </div>
        ) : node.type === 'treasure' ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-amber-800">
            <Gift className="h-6 w-6 shrink-0" />
            <span className="font-extrabold">
              {node.rewardAmount ?? 10} {node.rewardCurrency === 'gems' ? t('gems', 'permata') : 'XP'}
            </span>
          </div>
        ) : node.questions.length > 0 ? (
          <div className="mt-4 space-y-4">
            {node.questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <p className="select-text font-bold text-slate-700">{index + 1}. {question.prompt || t('Question prompt', 'Teks pertanyaan')}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={option.id} className="select-text rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                      <span className="mr-2 text-xs font-extrabold text-slate-400">{optionIndex + 1}.</span>
                      {option.text || t('Answer choice', 'Pilihan jawaban')}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">
            {t('Add at least one question to preview this quiz.', 'Tambahkan setidaknya satu pertanyaan untuk melihat pratinjau kuis ini.')}
          </p>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">
        {t('This preview is for review only; it does not change learner progress.', 'Pratinjau ini hanya untuk ditinjau dan tidak mengubah progres siswa.')}
      </p>
    </section>
  )
}

function GeneratedRoadmapReview({
  draft,
  onAdd,
  onDiscard,
  t,
}: {
  draft: GeneratedChapterDraft
  onAdd: () => void
  onDiscard: () => void
  t: (en: string, id: string) => string
}) {
  return (
    <section className="mt-5 space-y-4 rounded-2xl border-2 border-indigo-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
        <div>
          <h3 className="font-extrabold text-slate-800">{t('Review your generated draft', 'Tinjau draf yang dibuat')}</h3>
          <p className="text-xs font-semibold text-slate-500">{t('Check the chapter, lesson text, and answer keys. You can edit every item after adding it to the editor.', 'Periksa bab, teks pelajaran, dan kunci jawaban. Semua bagian dapat diedit setelah ditambahkan ke editor.')}</p>
        </div>
      </div>

      <div className="rounded-xl bg-indigo-50 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">{t('New chapter', 'Bab baru')}</p>
        <h4 className="mt-1 text-lg font-extrabold text-slate-800">{draft.chapterTitle}</h4>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{draft.summary}</p>
      </div>

      <ol className="space-y-3">
        {draft.nodes.map((node, index) => (
          <li key={`${index}-${node.title}`} className="rounded-xl border-2 border-slate-100 p-3">
            <div className="flex items-center gap-2">
              {node.type === 'quiz'
                ? <Gamepad2 className="h-4 w-4 text-violet-500" />
                : <FileText className="h-4 w-4 text-sky-500" />}
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {node.type === 'quiz' ? t('Quiz', 'Kuis') : t('Lesson', 'Pelajaran')} {index + 1}
              </span>
            </div>
            <h5 className="mt-1 font-extrabold text-slate-700">{node.title}</h5>
            {node.type === 'lesson' ? (
              <p className="mt-2 select-text whitespace-pre-line text-sm leading-relaxed text-slate-600">{node.content}</p>
            ) : (
              <div className="mt-3 space-y-3">
                {node.questions.map((question, questionIndex) => (
                  <div key={`${questionIndex}-${question.prompt}`} className="rounded-lg bg-slate-50 p-3">
                    <p className="select-text text-sm font-bold text-slate-700">{questionIndex + 1}. {question.prompt}</p>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => (
                        <li
                          key={`${optionIndex}-${option}`}
                          className={`select-text rounded-lg border px-2.5 py-2 text-xs font-semibold ${question.correctIndex === optionIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                        >
                          {optionIndex + 1}. {option}
                          {question.correctIndex === optionIndex && <span className="ml-1 font-extrabold">· {t('Correct answer', 'Jawaban benar')}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDiscard} className="rounded-xl px-4 py-2.5 text-sm font-extrabold text-slate-500 hover:bg-slate-50">
          {t('Discard draft', 'Buang draf')}
        </button>
        <button type="button" onClick={onAdd} className="inline-flex items-center justify-center gap-2 rounded-xl border-b-4 border-emerald-800 bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> {t('Add draft to curriculum editor', 'Tambahkan draf ke editor kurikulum')}
        </button>
      </div>
      <p className="text-xs font-semibold text-slate-500">
        {t('Adding only moves this draft into the editor. It is not saved to the curriculum until you press Save changes.', 'Menambahkan draf hanya memindahkannya ke editor. Draf belum disimpan ke kurikulum sampai kamu menekan Simpan perubahan.')}
      </p>
    </section>
  )
}

function NodeEditor({
  node,
  updateNode,
  onTypeChange,
  onMove,
  nodeIndex,
  nodeCount,
  onDelete,
  onAddQuestion,
  onUpdateQuestion,
  t,
}: {
  node: CurriculumNode
  updateNode: (update: (node: CurriculumNode) => CurriculumNode) => void
  onTypeChange: (type: CurriculumNode['type']) => void
  onMove: (direction: -1 | 1) => void
  nodeIndex: number
  nodeCount: number
  onDelete: () => void
  onAddQuestion: () => void
  onUpdateQuestion: (questionId: string, update: (question: CurriculumQuestion) => CurriculumQuestion) => void
  t: (en: string, id: string) => string
}) {
  const isUploadedMaterial = node.resourceUrl.includes('/storage/v1/object/public/lesson-materials/')
  const [materialMode, setMaterialMode] = useState<'text' | 'upload' | 'url'>(
    node.contentType === 'text' ? 'text' : isUploadedMaterial ? 'upload' : 'url'
  )
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false)
  const [materialUploadError, setMaterialUploadError] = useState('')

  const uploadLessonMaterial = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      setMaterialUploadError(t('Choose a file no larger than 25 MB.', 'Pilih file berukuran maksimal 25 MB.'))
      return
    }

    setIsUploadingMaterial(true)
    setMaterialUploadError('')
    const formData = new FormData()
    formData.set('file', file)
    try {
      const response = await fetch('/api/curriculum/material-upload', { method: 'POST', body: formData })
      let result: unknown
      try {
        result = await response.json()
      } catch {
        throw new Error(t('The upload service returned an unreadable response.', 'Layanan unggah mengirim respons yang tidak terbaca.'))
      }
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : t('Could not upload this file. Please try again.', 'File tidak dapat diunggah. Silakan coba lagi.')
        throw new Error(message)
      }
      if (
        typeof result !== 'object'
        || result === null
        || !('url' in result)
        || !('contentType' in result)
      ) {
        throw new Error(t('The upload service returned invalid file details.', 'Layanan unggah mengirim detail file yang tidak valid.'))
      }
      const uploadedUrl = result.url
      const uploadedContentType = result.contentType
      if (
        typeof uploadedUrl !== 'string'
        || (uploadedContentType !== 'poster' && uploadedContentType !== 'material')
      ) {
        throw new Error(t('The upload service returned invalid file details.', 'Layanan unggah mengirim detail file yang tidak valid.'))
      }
      updateNode((current) => ({
        ...current,
        contentType: uploadedContentType,
        resourceUrl: uploadedUrl,
      }))
    } catch (error) {
      console.error('Failed to upload lesson material.', error)
      setMaterialUploadError(error instanceof Error
        ? error.message
        : t('Could not upload this file. Please try again.', 'File tidak dapat diunggah. Silakan coba lagi.'))
    } finally {
      setIsUploadingMaterial(false)
    }
  }

  return (
    <div className="teacher-node-editor space-y-5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-extrabold text-slate-700"><FilePlus2 className="h-5 w-5 text-indigo-500" /> {t('Edit learning step', 'Edit langkah belajar')}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={nodeIndex === 0} aria-label={t('Move step up', 'Pindahkan langkah ke atas')} className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"><MoveUp className="h-5 w-5" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={nodeIndex === nodeCount - 1} aria-label={t('Move step down', 'Pindahkan langkah ke bawah')} className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"><MoveDown className="h-5 w-5" /></button>
          <button type="button" onClick={onDelete} aria-label={t('Delete node', 'Hapus node')} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-5 w-5" /></button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {node.type !== 'treasure' && (
          <label className="sm:col-span-2"><span className={labelClass}>{t('Node title', 'Judul node')}</span>
            <input className={inputClass} value={node.title} onChange={(event) => updateNode((current) => ({ ...current, title: event.target.value }))} />
          </label>
        )}
        <label><span className={labelClass}>{t('Activity type', 'Jenis aktivitas')}</span>
          <select className={inputClass} value={node.type} onChange={(event) => onTypeChange(event.target.value as CurriculumNode['type'])}>
            <option value="lesson">{t('Lesson / material', 'Pelajaran / materi')}</option><option value="quiz">{t('Quiz', 'Kuis')}</option><option value="boss">{t('Final boss', 'Bos akhir')}</option><option value="treasure">{t('Treasure chest', 'Peti harta')}</option>
          </select>
        </label>
        <label><span className={labelClass}>{t('Node status', 'Status node')}</span>
          <select className={inputClass} value={node.status} onChange={(event) => updateNode((current) => ({ ...current, status: event.target.value as CurriculumNode['status'] }))}>
            <option value="current">{t('Available', 'Tersedia')}</option><option value="completed">{t('Completed', 'Selesai')}</option><option value="locked">{t('Locked', 'Terkunci')}</option>
          </select>
        </label>
      </div>

      {node.type === 'lesson' ? (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className={labelClass}>{t('Lesson material', 'Materi pelajaran')}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                ['text', t('Text', 'Teks')],
                ['upload', t('Upload file', 'Unggah file')],
                ['url', 'URL'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={materialMode === mode}
                  disabled={isUploadingMaterial}
                  onClick={() => {
                    setMaterialMode(mode)
                    setMaterialUploadError('')
                    if (mode === 'text') updateNode((current) => ({ ...current, contentType: 'text' }))
                    if (mode === 'url') updateNode((current) => ({ ...current, contentType: 'material' }))
                  }}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-extrabold transition-colors ${
                    materialMode === mode
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {materialMode === 'text' ? (
            <label className="block"><span className={labelClass}>{t('Lesson text', 'Teks materi')}</span>
              <textarea className={`${inputClass} min-h-24 max-h-60 resize-y leading-relaxed`} rows={3} value={node.content} onChange={(event) => updateNode((current) => ({ ...current, content: event.target.value }))} placeholder={t('Write the lesson content...', 'Tulis materi pelajaran...')} />
            </label>
          ) : materialMode === 'upload' ? (
            <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
              <label className="block">
                <span className={labelClass}>{t('Upload a file', 'Unggah file')}</span>
                <input
                  type="file"
                  accept=".ppt,.pptx,.pdf,.png,.jpg,.jpeg,.webp,.gif,.avif,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png,image/jpeg,image/webp,image/gif,image/avif"
                  disabled={isUploadingMaterial}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadLessonMaterial(file)
                    event.target.value = ''
                  }}
                  className="block w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600 file:mr-3 file:cursor-pointer file:border-0 file:bg-indigo-50 file:px-4 file:py-3 file:font-extrabold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-60"
                />
              </label>
              <p className="text-xs font-semibold text-slate-400">
                {t('PDF, PowerPoint, or image · up to 25 MB. Combine multiple posters into one PDF.', 'PDF, PowerPoint, atau gambar · maksimal 25 MB. Gabungkan beberapa poster menjadi satu PDF.')}
              </p>
              {isUploadingMaterial && <p role="status" className="text-sm font-bold text-indigo-600">{t('Uploading file…', 'Mengunggah file…')}</p>}
              {materialUploadError && <p role="alert" className="text-sm font-bold text-rose-700">{materialUploadError}</p>}
            </div>
          ) : (
            <label className="block"><span className={labelClass}>{node.contentType === 'poster' ? t('Image URL', 'URL gambar') : t('Document URL', 'URL dokumen')}</span>
              <div className="relative">
                <BookOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input className={`${inputClass} pl-10`} type="url" value={node.resourceUrl} onChange={(event) => updateNode((current) => ({ ...current, resourceUrl: event.target.value }))} placeholder="https://..." />
              </div>
              <span className="mt-1 block text-xs font-semibold text-slate-400">{t('Use a publicly accessible file URL.', 'Gunakan URL file yang dapat diakses publik.')}</span>
            </label>
          )}
        </div>
      ) : node.type === 'treasure' ? (
        <div className="grid gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-4 sm:grid-cols-2">
          <label>
            <span className={labelClass}>{t('Treasure reward', 'Hadiah peti')}</span>
            <select
              className={inputClass}
              value={node.rewardCurrency ?? 'xp'}
              onChange={(event) => updateNode((current) => ({
                ...current,
                rewardCurrency: event.target.value as NonNullable<CurriculumNode['rewardCurrency']>,
              }))}
            >
              <option value="xp">XP</option>
              <option value="gems">{t('Gems', 'Permata')}</option>
            </select>
          </label>
          <label>
            <span className={labelClass}>{t('Reward amount (10–100,000)', 'Jumlah hadiah (10–100.000)')}</span>
            <input
              className={inputClass}
              type="number"
              min={10}
              max={100_000}
              step={1}
              value={node.rewardAmount ?? 10}
              onChange={(event) => updateNode((current) => ({
                ...current,
                rewardAmount: Number(event.target.value),
              }))}
            />
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h4 className="font-extrabold text-slate-700">{t('Questions', 'Pertanyaan')}</h4><p className="text-xs font-semibold text-slate-400">{t('Provide 4 or 5 choices. Mark every correct answer; choices start as incorrect.', 'Sediakan 4 atau 5 pilihan. Tandai setiap jawaban benar; semua pilihan dimulai sebagai salah.')}</p></div>
            <button type="button" onClick={onAddQuestion} className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-indigo-600 hover:bg-indigo-50"><Plus className="mr-1 inline h-4 w-4" />{t('Add question', 'Tambah pertanyaan')}</button>
          </div>
          {node.questions.map((question, questionIndex) => (
            <div key={question.id} className="space-y-3 rounded-2xl border-2 border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{t('Question', 'Pertanyaan')} {questionIndex + 1}</span>
                <button type="button" disabled={node.questions.length <= 1} onClick={() => updateNode((current) => ({ ...current, questions: current.questions.filter((item) => item.id !== question.id) }))} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-30" aria-label={t('Delete question', 'Hapus pertanyaan')}><Trash2 className="h-4 w-4" /></button>
              </div>
              <textarea className={inputClass} rows={2} value={question.prompt} onChange={(event) => onUpdateQuestion(question.id, (current) => ({ ...current, prompt: event.target.value }))} placeholder={t('Write the question...', 'Tulis pertanyaan...')} />
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={option.isCorrect}
                      onChange={(event) => onUpdateQuestion(question.id, (current) => ({
                        ...current,
                        options: current.options.map((item) => item.id === option.id
                          ? { ...item, isCorrect: event.target.checked }
                          : item),
                      }))}
                      aria-label={t(`Choice ${optionIndex + 1} is correct`, `Pilihan ${optionIndex + 1} benar`)}
                      className="h-4 w-4 accent-emerald-600 disabled:cursor-not-allowed"
                    />
                    <span className="w-6 text-xs font-extrabold text-slate-400">{optionIndex + 1}</span>
                    <input className={`${inputClass} py-2`} value={option.text} onChange={(event) => onUpdateQuestion(question.id, (current) => ({ ...current, options: current.options.map((item) => item.id === option.id ? { ...item, text: event.target.value } : item) }))} placeholder={t('Answer choice', 'Pilihan jawaban')} />
                    <span className={`w-20 shrink-0 text-right text-[11px] font-extrabold ${option.isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {option.isCorrect ? t('Correct', 'Benar') : t('Incorrect', 'Salah')}
                    </span>
                    <button type="button" disabled={question.options.length <= 4} onClick={() => onUpdateQuestion(question.id, (current) => {
                      const options = current.options.filter((item) => item.id !== option.id)
                      const hasCorrect = options.some((item) => item.isCorrect)
                      return {
                        ...current,
                        options: options.map((item, index) => ({
                          ...item,
                          isCorrect: hasCorrect ? item.isCorrect : index === 0,
                        })),
                      }
                    })} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 disabled:opacity-30" aria-label={t('Remove answer choice', 'Hapus pilihan jawaban')}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {question.options.length < 5 && (
                  <button type="button" onClick={() => onUpdateQuestion(question.id, (current) => ({
                    ...current,
                    options: [...current.options, { id: createCurriculumId('option'), text: '', isCorrect: false }],
                  }))} className="ml-8 rounded-lg px-2 py-1 text-xs font-extrabold text-indigo-600 hover:bg-indigo-50">
                    <Plus className="mr-1 inline h-3.5 w-3.5" />{t('Add answer choice', 'Tambah pilihan jawaban')}
                  </button>
                )}
              </div>
              {!question.options.some((option) => option.isCorrect) && (
                <p role="alert" className="flex items-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t('No correct answer is set. Select every correct choice before saving.', 'Belum ada jawaban benar. Pilih semua jawaban yang benar sebelum menyimpan.')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
