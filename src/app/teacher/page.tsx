'use client'

import React, { useEffect, useState } from 'react'
import {
  AlertCircle, BookOpen, Check, FilePlus2, Save, GraduationCap, Image,
  Plus, Sparkles, Trash2, UploadCloud,
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import {
  createCurriculumId,
  createDefaultCurriculum,
  readCurriculum,
  writeCurriculum,
  type CurriculumChapter,
  type CurriculumNode,
  type CurriculumQuestion,
  type CurriculumSubject,
} from '@/src/lib/teacherContent'

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

function makeNode(): CurriculumNode {
  return {
    id: createCurriculumId('node'),
    title: '',
    type: 'lesson',
    status: 'current',
    contentType: 'text',
    content: '',
    resourceUrl: '',
    questions: [makeQuestion()],
  }
}

function makeChapter(order: number): CurriculumChapter {
  return {
    id: createCurriculumId('chapter'),
    title: '',
    order,
    summary: '',
    chaptersStatus: 'in_progress',
    nodes: [makeNode()],
  }
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

export default function TeacherPage() {
  const { t } = useLanguage()
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([])
  const [savedSubjects, setSavedSubjects] = useState<CurriculumSubject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [storageReady, setStorageReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (storageReady) return
    const initial = readCurriculum(createDefaultCurriculum(t))
    setSubjects(initial)
    setSavedSubjects(initial)
    setSelectedSubjectId(initial[0]?.id ?? '')
    setSelectedChapterId(initial[0]?.chapters[0]?.id ?? '')
    setSelectedNodeId(initial[0]?.chapters[0]?.nodes[0]?.id ?? '')
    setStorageReady(true)
  }, [storageReady, t])

  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId)
  const selectedChapter = selectedSubject?.chapters.find((chapter) => chapter.id === selectedChapterId)
  const selectedNode = selectedChapter?.nodes.find((node) => node.id === selectedNodeId)

  const hasUnsavedChanges = JSON.stringify(subjects) !== JSON.stringify(savedSubjects)

  const updateDraft = (next: CurriculumSubject[]) => {
    setSubjects(next)
    setError('')
  }

  const saveChanges = () => {
    if (!hasUnsavedChanges) return
    try {
      writeCurriculum(subjects)
      setSavedSubjects(subjects)
      setError('')
    } catch (saveError) {
      console.error('Failed to save curriculum changes.', saveError)
      setError(t('Could not save changes in this browser. Check available storage.', 'Perubahan tidak dapat disimpan di browser ini. Periksa ruang penyimpanan.'))
    }
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
    setSelectedNodeId(subject.chapters[0].nodes[0].id)
  }

  const addChapter = () => {
    if (!selectedSubject) return
    const chapter = makeChapter(selectedSubject.chapters.length + 1)
    updateSubject(selectedSubject.id, (subject) => ({ ...subject, chapters: [...subject.chapters, chapter] }))
    setSelectedChapterId(chapter.id)
    setSelectedNodeId(chapter.nodes[0].id)
  }

  const addNode = () => {
    if (!selectedSubject || !selectedChapter) return
    const node = makeNode()
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, nodes: [...chapter.nodes, node] }))
    setSelectedNodeId(node.id)
  }

  const deleteSubject = () => {
    if (!selectedSubject || !window.confirm(t(`Delete "${selectedSubject.name}" and all its chapters?`, `Hapus "${selectedSubject.name}" dan semua babnya?`))) return
    const next = subjects.filter((subject) => subject.id !== selectedSubject.id)
    updateDraft(next)
    setSelectedSubjectId(next[0]?.id ?? '')
    setSelectedChapterId(next[0]?.chapters[0]?.id ?? '')
    setSelectedNodeId(next[0]?.chapters[0]?.nodes[0]?.id ?? '')
  }

  const deleteChapter = () => {
    if (!selectedSubject || !selectedChapter || !window.confirm(t(`Delete "${selectedChapter.title}" and its roadmap?`, `Hapus "${selectedChapter.title}" dan petanya?`))) return
    const chapters = selectedSubject.chapters.filter((chapter) => chapter.id !== selectedChapter.id)
    updateSubject(selectedSubject.id, (subject) => ({ ...subject, chapters }))
    setSelectedChapterId(chapters[0]?.id ?? '')
    setSelectedNodeId(chapters[0]?.nodes[0]?.id ?? '')
  }

  const deleteNode = () => {
    if (!selectedSubject || !selectedChapter || !selectedNode || !window.confirm(t(`Delete "${selectedNode.title}"?`, `Hapus "${selectedNode.title}"?`))) return
    const nodes = selectedChapter.nodes.filter((node) => node.id !== selectedNode.id)
    updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, nodes }))
    setSelectedNodeId(nodes[0]?.id ?? '')
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
      questions: type === 'quiz' && node.questions.length === 0 ? [makeQuestion()] : node.questions,
    }))
  }

  if (!storageReady) return null

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
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
        <button type="button" onClick={addSubject} className="inline-flex items-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-3 font-extrabold text-white hover:bg-indigo-700">
          <Plus className="h-5 w-5" /> {t('Add subject', 'Tambah mata pelajaran')}
        </button>
      </header>

      <section className="rounded-3xl border-2 border-indigo-100 bg-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-2.5 text-indigo-600"><Sparkles className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-slate-800">{t('Generate a roadmap from materials', 'Buat peta belajar dari materi')}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {t('AI material upload and roadmap generation are not connected yet. For now, build and edit the roadmap manually below.', 'Unggah materi dan pembuatan peta dengan AI belum tersedia. Untuk saat ini, buat dan edit peta secara manual di bawah.')}
            </p>
            <button type="button" disabled className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-400 opacity-80">
              <UploadCloud className="h-4 w-4" /> {t('AI material import — coming soon', 'Impor materi dengan AI — segera hadir')}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">
          <AlertCircle className="h-5 w-5 shrink-0" /> {error}
        </div>
      )}

      <div className="space-y-4">
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 sm:max-w-xl">
              <span className={labelClass}>{t('Select subject', 'Pilih mata pelajaran')}</span>
              <select
                className={inputClass}
                value={selectedSubject?.id ?? ''}
                onChange={(event) => {
                  const subject = subjects.find((item) => item.id === event.target.value)
                  setSelectedSubjectId(subject?.id ?? '')
                  setSelectedChapterId(subject?.chapters[0]?.id ?? '')
                  setSelectedNodeId(subject?.chapters[0]?.nodes[0]?.id ?? '')
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
                  <input className={inputClass} value={selectedSubject.name} onChange={(event) => updateSubject(selectedSubject.id, (subject) => ({ ...subject, name: event.target.value }))} placeholder={t('e.g. Mathematics', 'mis. Matematika')} />
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
                      setSelectedNodeId(chapter?.nodes[0]?.id ?? '')
                    }}
                  >
                    {selectedSubject.chapters.length === 0 && <option value="">{t('No chapters yet', 'Belum ada bab')}</option>}
                    {selectedSubject.chapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>{chapter.order}. {chapter.title || t('Untitled chapter', 'Bab tanpa judul')}</option>
                    ))}
                  </select>
                </label>
                {selectedChapter && <span className="pb-2 text-xs font-bold text-slate-400">{selectedChapter.nodes.length} {t('roadmap nodes', 'node peta belajar')}</span>}
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
                  <label className="sm:col-span-2"><span className={labelClass}>{t('Chapter summary', 'Ringkasan bab')}</span>
                    <textarea className={inputClass} rows={2} value={selectedChapter.summary} onChange={(event) => updateChapter(selectedSubject.id, selectedChapter.id, (chapter) => ({ ...chapter, summary: event.target.value }))} />
                  </label>
                </div>

                <div className="border-t-2 border-slate-100 pt-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div><h3 className="font-extrabold text-slate-700">{t('Roadmap nodes', 'Node peta belajar')}</h3><p className="text-xs font-semibold text-slate-400">{t('Choose a node to edit its lesson or questions.', 'Pilih node untuk mengedit materi atau pertanyaannya.')}</p></div>
                    <button type="button" onClick={addNode} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> {t('Add node', 'Tambah node')}</button>
                  </div>
                  <label className="block max-w-2xl"><span className={labelClass}>{t('Select roadmap node', 'Pilih node peta belajar')}</span>
                    <select className={inputClass} value={selectedNode?.id ?? ''} onChange={(event) => setSelectedNodeId(event.target.value)}>
                      {selectedChapter.nodes.length === 0 && <option value="">{t('No nodes yet', 'Belum ada node')}</option>}
                      {selectedChapter.nodes.map((node, index) => (
                        <option key={node.id} value={node.id}>{index + 1}. {node.title || t('Untitled node', 'Node tanpa judul')} ({node.type === 'quiz' ? t('Quiz', 'Kuis') : t('Lesson', 'Materi')})</option>
                      ))}
                    </select>
                  </label>
                </div>

                {selectedNode ? (
                  <NodeEditor
                    node={selectedNode}
                    updateNode={(update) => updateNode(selectedSubject.id, selectedChapter.id, selectedNode.id, update)}
                    onTypeChange={setNodeType}
                    onDelete={deleteNode}
                    onAddQuestion={addQuestion}
                    onUpdateQuestion={updateQuestion}
                    t={t}
                  />
                ) : (
                  <p className="rounded-xl bg-slate-50 p-5 text-center font-bold text-slate-400">{t('Add a node to this roadmap.', 'Tambahkan node ke peta ini.')}</p>
                )}
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
          disabled={!hasUnsavedChanges}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-5 py-3 font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200 sm:w-auto"
        >
          {hasUnsavedChanges ? <Save className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          {hasUnsavedChanges ? t('Save changes', 'Simpan perubahan') : t('Saved', 'Tersimpan')}
        </button>
      </div>
      <p className="text-center text-xs font-semibold text-slate-400">
        {t('Prototype: edits are stored in this browser and are not yet synced to accounts or a server.', 'Prototipe: perubahan tersimpan di browser ini dan belum disinkronkan ke akun atau server.')}
      </p>
    </div>
  )
}

function NodeEditor({
  node,
  updateNode,
  onTypeChange,
  onDelete,
  onAddQuestion,
  onUpdateQuestion,
  t,
}: {
  node: CurriculumNode
  updateNode: (update: (node: CurriculumNode) => CurriculumNode) => void
  onTypeChange: (type: CurriculumNode['type']) => void
  onDelete: () => void
  onAddQuestion: () => void
  onUpdateQuestion: (questionId: string, update: (question: CurriculumQuestion) => CurriculumQuestion) => void
  t: (en: string, id: string) => string
}) {
  return (
    <div className="teacher-node-editor space-y-5 rounded-2xl border-2 border-slate-100 bg-slate-50/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-extrabold text-slate-700"><FilePlus2 className="h-5 w-5 text-indigo-500" /> {t('Edit node', 'Edit node')}</h3>
        <button type="button" onClick={onDelete} aria-label={t('Delete node', 'Hapus node')} className="rounded-xl p-2 text-rose-500 hover:bg-rose-50"><Trash2 className="h-5 w-5" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="sm:col-span-2"><span className={labelClass}>{t('Node title', 'Judul node')}</span>
          <input className={inputClass} value={node.title} onChange={(event) => updateNode((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label><span className={labelClass}>{t('Activity type', 'Jenis aktivitas')}</span>
          <select className={inputClass} value={node.type} onChange={(event) => onTypeChange(event.target.value as CurriculumNode['type'])}>
            <option value="lesson">{t('Lesson / material', 'Pelajaran / materi')}</option><option value="quiz">{t('Quiz', 'Kuis')}</option>
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
          <label className="block"><span className={labelClass}>{t('Lesson content type', 'Jenis materi')}</span>
            <select className={inputClass} value={node.contentType} onChange={(event) => updateNode((current) => ({ ...current, contentType: event.target.value as CurriculumNode['contentType'] }))}>
              <option value="text">{t('Text lesson', 'Materi teks')}</option><option value="poster">{t('Poster image', 'Gambar poster')}</option><option value="material">{t('PDF / e-book URL', 'URL PDF / e-book')}</option>
            </select>
          </label>
          {node.contentType === 'text' ? (
            <label className="block"><span className={labelClass}>{t('Lesson text', 'Teks materi')}</span>
              <textarea className={`${inputClass} min-h-24 max-h-60 resize-y leading-relaxed`} rows={3} value={node.content} onChange={(event) => updateNode((current) => ({ ...current, content: event.target.value }))} placeholder={t('Write the lesson content...', 'Tulis materi pelajaran...')} />
            </label>
          ) : (
            <label className="block"><span className={labelClass}>{node.contentType === 'poster' ? t('Image URL', 'URL gambar') : t('Document URL', 'URL dokumen')}</span>
              <div className="relative">
                {node.contentType === 'poster' ? <Image className="absolute left-3 top-3 h-4 w-4 text-slate-400" /> : <BookOpen className="absolute left-3 top-3 h-4 w-4 text-slate-400" />}
                <input className={`${inputClass} pl-10`} type="url" value={node.resourceUrl} onChange={(event) => updateNode((current) => ({ ...current, resourceUrl: event.target.value }))} placeholder="https://..." />
              </div>
              <span className="mt-1 block text-xs font-semibold text-slate-400">{t('Use a publicly accessible URL for now. File uploads will be added with storage integration.', 'Gunakan URL publik untuk saat ini. Unggah file akan tersedia setelah integrasi penyimpanan.')}</span>
            </label>
          )}
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
