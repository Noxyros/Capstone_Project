'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle2, Gift, Heart, Infinity as InfinityIcon, Swords, X, XCircle, Trophy } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { LearningTutor } from '@/src/components/shared/LearningTutor'
import { PdfMaterialPreview } from '@/src/components/shared/PdfMaterialPreview'
import { loadCurriculum, saveNodeProgress } from '@/src/lib/curriculumClient'
import { getCurriculumResourceFormat, type CurriculumNode } from '@/src/lib/teacherContent'
import { useUser } from '@/src/context/UserContext'
import { useAuth } from '@/src/context/AuthContext'
import { isAppProfile, type AppProfile } from '@/src/lib/appProfile'
import AppLoadingScreen from '@/src/components/shared/AppLoadingScreen'

type QuizOption = {
  id: string
  text: string
}

type QuizQuestion = {
  id: string
  prompt: string
  allowsMultipleAnswers?: boolean
  options: QuizOption[]
}

type CheckedAnswerResult = {
  isCorrect: boolean
  correctOptionIds: string[]
  profile: AppProfile
}

function isCheckedAnswerResult(value: unknown): value is CheckedAnswerResult {
  return typeof value === 'object'
    && value !== null
    && 'isCorrect' in value
    && typeof value.isCorrect === 'boolean'
    && 'correctOptionIds' in value
    && Array.isArray(value.correctOptionIds)
    && value.correctOptionIds.every((id) => typeof id === 'string')
    && 'profile' in value
    && isAppProfile(value.profile)
}

type LessonContent =
  | { kind: 'text'; value: string }
  | { kind: 'poster'; src: string; alt: string }
  | { kind: 'material'; src: string; format: 'pdf' | 'ebook' | 'file' }

type NodeData =
  | { type: 'lesson'; title: string; content: LessonContent }
  | { type: 'quiz'; title: string; questions: QuizQuestion[]; isBoss: boolean }
  | { type: 'treasure'; title: string; rewardCurrency: 'xp' | 'gems'; rewardAmount: number; isCompleted: boolean }

export default function NodeActivityPage() {
  const { t } = useLanguage()
  const { hearts, unlimitedHearts, setSuperMode } = useUser()
  const { user, updateProfile } = useAuth()
  const curriculumScope = user?.id ?? 'public'
  const router = useRouter()
  const params = useParams<{ id: string; nodeId: string }>()
  const { id: chapterId, nodeId } = params
  const [nodeData, setNodeData] = useState<NodeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    void loadCurriculum(undefined, curriculumScope)
      .then((subjects) => {
        const chapter = subjects.flatMap((subject) => subject.chapters).find((item) => item.id === chapterId)
        const node: CurriculumNode | undefined = chapter?.nodes.find((item) => item.id === nodeId)
        if (!active) return
        if (!node) {
          setLoadError(t('This learning activity is unavailable.', 'Aktivitas belajar ini tidak tersedia.'))
          return
        }
        if (node.type === 'quiz' || node.type === 'boss') {
          setNodeData({
            type: 'quiz',
            title: node.title,
            questions: node.questions,
            isBoss: node.type === 'boss' || chapter?.nodes.at(-1)?.id === node.id,
          })
        } else if (node.type === 'treasure') {
          if (!node.rewardCurrency || !node.rewardAmount) {
            setLoadError(t('This treasure reward is not configured.', 'Hadiah peti harta ini belum diatur.'))
            return
          }
          setNodeData({
            type: 'treasure',
            title: node.title,
            rewardCurrency: node.rewardCurrency,
            rewardAmount: node.rewardAmount,
            isCompleted: node.status === 'completed',
          })
        } else {
          const resourceFormat = getCurriculumResourceFormat(node.resourceUrl)
          setNodeData({
            type: 'lesson',
            title: node.title,
            content: node.contentType === 'text' || !node.resourceUrl
              ? { kind: 'text', value: node.content || t('This lesson has no content yet.', 'Materi pelajaran ini belum tersedia.') }
              : node.contentType === 'poster' || resourceFormat === 'image'
                ? { kind: 'poster', src: node.resourceUrl, alt: node.title }
                : {
                  kind: 'material',
                  src: node.resourceUrl,
                    format: resourceFormat === 'pdf'
                      ? 'pdf'
                      : resourceFormat === 'presentation' ? 'file' : 'ebook',
                  },
          })
        }
      })
      .catch((error) => {
        console.error('Failed to load learning activity.', error)
        if (active) setLoadError(error instanceof Error ? error.message : t('Could not load this activity.', 'Tidak dapat memuat aktivitas ini.'))
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [chapterId, curriculumScope, nodeId, t])

  useEffect(() => {
    if (!isExitDialogOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExitDialogOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isExitDialogOpen])

  const completeActivity = async (attemptId?: string) => {
    setProgressError('')
    try {
      const result = await saveNodeProgress(nodeId, attemptId)
      updateProfile(result.profile)
      router.push(`/chapter/${chapterId}`)
    } catch (error) {
      console.warn('Failed to save completed activity.', error)
      setProgressError(error instanceof Error ? error.message : t('Could not save your progress. Please try again.', 'Tidak dapat menyimpan progres. Silakan coba lagi.'))
    }
  }

  const requestExit = () => {
    if (nodeData?.type === 'quiz') {
      setIsExitDialogOpen(true)
      return
    }
    router.push(`/chapter/${chapterId}`)
  }

  if (isLoading) return <AppLoadingScreen message={t('Preparing your activity…', 'Menyiapkan aktivitasmu…')} />
  if (loadError || !nodeData) return <p role="alert" className="p-8 text-center font-bold text-rose-700">{loadError || t('This activity is unavailable.', 'Aktivitas ini tidak tersedia.')}</p>

  return (
    <div className={`${nodeData.type === 'quiz' ? 'app-screen-enter' : ''} mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7`}>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          {nodeData.type === 'quiz' ? (
            <div
              aria-label={unlimitedHearts ? t('Unlimited hearts', 'Hati tak terbatas') : t(`${hearts} hearts remaining`, `Sisa ${hearts} hati`)}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-100 bg-white px-3 py-2 font-extrabold text-rose-500 shadow-sm"
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
                {unlimitedHearts && <InfinityIcon className="absolute h-3 w-3 stroke-[3] text-white" />}
              </span>
              <span>{unlimitedHearts ? '∞' : hearts}</span>
            </div>
          ) : <span />}
          <button
            type="button"
            onClick={requestExit}
            aria-label={t('Exit to roadmap', 'Keluar ke peta belajar')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>
        <div className={`mt-4 ${nodeData.type === 'quiz' && !nodeData.isBoss ? 'hidden md:block' : ''}`}>
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-indigo-600 md:order-2">
            {nodeData.type === 'lesson'
              ? t('Lesson', 'Pelajaran')
              : nodeData.type === 'treasure'
                ? t('Treasure', 'Harta')
                : nodeData.isBoss ? t('Final boss', 'Bos akhir') : t('Quiz', 'Kuis')}
          </span>
          {nodeData.type !== 'treasure' && nodeData.title && (
            <h1 className="mt-1 truncate text-xl font-extrabold leading-tight text-slate-700">{nodeData.title}</h1>
          )}
        </div>
      </div>

      {progressError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{progressError}</p>}

      <div className="flex flex-1 flex-col justify-center">
        {nodeData.type === 'lesson' ? (
          <LessonActivity title={nodeData.title} content={nodeData.content} onComplete={() => { void completeActivity() }} />
        ) : nodeData.type === 'treasure' ? (
          <TreasureActivity
            title={nodeData.title}
            rewardCurrency={nodeData.rewardCurrency}
            rewardAmount={nodeData.rewardAmount}
            isCompleted={nodeData.isCompleted}
            onClaim={() => { void completeActivity() }}
            t={t}
          />
        ) : (
          <QuizActivity
            nodeId={nodeId}
            title={nodeData.title}
            questions={nodeData.questions}
            isBoss={nodeData.isBoss}
            onComplete={(attemptId) => { void completeActivity(attemptId) }}
            hearts={hearts}
            superMode={unlimitedHearts}
            setSuperMode={setSuperMode}
            onProfileUpdate={updateProfile}
          />
        )}
      </div>

      {isExitDialogOpen && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setIsExitDialogOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="exit-quiz-title"
            aria-describedby="exit-quiz-description"
            className="w-full max-w-md rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-3xl shadow-sm"
              >
                🦉
              </div>
              <div className="rounded-2xl rounded-bl-md bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                {t('A quick heads-up!', 'Tunggu dulu!')}
              </div>
            </div>
            <h2 id="exit-quiz-title" className="text-xl font-extrabold text-slate-800">
              {t('Leave this quiz?', 'Keluar dari kuis ini?')}
            </h2>
            <p id="exit-quiz-description" className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              {t(
                'Your answers and quiz progress will be lost. This node will not be marked complete.',
                'Jawaban dan progres kuis akan hilang. Bagian ini tidak akan ditandai selesai.'
              )}
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setIsExitDialogOpen(false)
                  router.push(`/chapter/${chapterId}`)
                }}
                className="flex-1 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 font-extrabold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                {t('Leave quiz', 'Keluar dari kuis')}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setIsExitDialogOpen(false)}
                className="flex-1 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-4 py-3 font-extrabold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
              >
                {t('Keep learning', 'Lanjut belajar')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

function TreasureActivity({
  title,
  rewardCurrency,
  rewardAmount,
  isCompleted,
  onClaim,
  t,
}: {
  title: string
  rewardCurrency: 'xp' | 'gems'
  rewardAmount: number
  isCompleted: boolean
  onClaim: () => void
  t: (en: string, id: string) => string
}) {
  return (
    <section className="overflow-hidden rounded-3xl border-2 border-amber-200 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-4 bg-amber-50 px-6 py-10 text-center sm:px-8">
        <span className="grid h-20 w-20 place-items-center rounded-3xl border-2 border-amber-200 bg-white text-amber-500 shadow-sm">
          <Gift className="h-10 w-10" />
        </span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-amber-600">
            {t('Treasure found', 'Peti harta ditemukan')}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {t('A one-time reward is waiting inside.', 'Hadiah satu kali menantimu di dalam.')}
          </p>
        </div>
        <div className="rounded-2xl border-2 border-amber-200 bg-white px-6 py-3 text-2xl font-black text-amber-700">
          +{rewardAmount} {rewardCurrency === 'gems' ? t('gems', 'permata') : 'XP'}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <button
          type="button"
          onClick={onClaim}
          disabled={isCompleted}
          className="w-full rounded-2xl border-b-4 border-amber-800 bg-amber-500 px-5 py-4 font-extrabold text-white transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
        >
          {isCompleted ? t('Already collected', 'Sudah diklaim') : t('Open treasure', 'Buka peti harta')}
        </button>
      </div>
    </section>
  )
}

function LessonActivity({ title, content, onComplete }: { title: string; content: LessonContent; onComplete: () => void }) {
  const { t } = useLanguage()
  const [pdfText, setPdfText] = useState('')
  const media = content.kind === 'poster'
    ? { type: 'image' as const, url: content.src }
    : content.kind === 'material' && content.format === 'pdf'
      ? { type: 'pdf' as const, text: pdfText }
      : undefined
  const mediaNote = content.kind === 'material' && content.format === 'pdf' && !pdfText
    ? t(
      'This PDF has no selectable text. Scanned-image PDFs cannot be read by the tutor yet.',
      'PDF ini tidak memiliki teks yang dapat dipilih. Tutor belum dapat membaca hasil pindai berupa gambar.'
    )
    : ''

  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        {content.kind === 'text' && (
          <div className="whitespace-pre-line font-medium text-slate-700 leading-relaxed text-lg">
            {content.value}
          </div>
        )}
        {content.kind === 'poster' && (
          <img
            src={content.src}
            alt={content.alt}
            className="block w-full h-auto rounded-2xl"
          />
        )}
        {content.kind === 'material' && (
          <div>
            {content.format === 'pdf' ? (
              <PdfMaterialPreview
                src={content.src}
                title={t('PDF material', 'Materi PDF')}
                t={t}
                onTextExtracted={setPdfText}
              />
            ) : content.format !== 'file' ? (
              <iframe
                src={content.src}
                title={t('E-book material', 'Materi e-book')}
                className="w-full h-[65vh] min-h-96 rounded-2xl border-2 border-slate-200 bg-slate-50"
              />
            ) : null}
            {content.format === 'file' && (
              <a
                href={content.src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex font-bold text-slate-700 underline underline-offset-4"
              >
                {t('Open PowerPoint file', 'Buka file PowerPoint')}
              </a>
            )}
          </div>
        )}
      </div>

      <LearningTutor
        context={{
          kind: 'lesson',
          title,
          content: content.kind === 'text' ? content.value : '',
          mediaNote,
          media,
        }}
      />

      <button
        type="button"
        onClick={onComplete}
        className="flex w-full items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl border-b-4 border-indigo-800 transition-all active:border-b-0 active:translate-y-1 shadow-sm"
      >
        {t('Continue', 'Lanjutkan')}
      </button>
    </div>
  )
}

type QuizResponse = {
  selectedOptionIds: string[]
  checked: boolean
  isCorrect?: boolean
}

function QuizActivity({
  nodeId,
  title,
  questions,
  isBoss,
  onComplete,
  hearts,
  superMode,
  setSuperMode,
  onProfileUpdate,
}: {
  nodeId: string
  title: string
  questions: QuizQuestion[]
  isBoss: boolean
  onComplete: (attemptId: string) => void
  hearts: number
  superMode: boolean
  setSuperMode: (enabled: boolean) => Promise<boolean>
  onProfileUpdate: (profile: import('@/src/lib/appProfile').AppProfile) => void
}) {
  const { t } = useLanguage()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<number, QuizResponse>>({})
  const [correctOptionIdsByQuestion, setCorrectOptionIdsByQuestion] = useState<Record<number, string[]>>({})
  const [isFinished, setIsFinished] = useState(false)
  const [attemptId, setAttemptId] = useState('')
  const [attemptError, setAttemptError] = useState('')
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isActivatingSuperMode, setIsActivatingSuperMode] = useState(false)

  const handleActivateSuperMode = async () => {
    setIsActivatingSuperMode(true)
    setAttemptError('')
    const enabled = await setSuperMode(true)
    if (!enabled) {
      setAttemptError(t(
        'Could not activate Super Mode. Please try again.',
        'Tidak dapat mengaktifkan Mode Super. Silakan coba lagi.',
      ))
    }
    setIsActivatingSuperMode(false)
  }

  useEffect(() => {
    if (attemptId || isFinished) return
    if (hearts <= 0 && !superMode) {
      setAttemptError(t('You are out of hearts. Refill your hearts or activate Super Mode to continue.', 'Kamu kehabisan hati. Isi ulang hati atau aktifkan Mode Super untuk melanjutkan.'))
      return
    }
    let active = true
    setAttemptError('')
    void fetch('/api/quiz-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId }),
    }).then(async (response) => {
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : t('Could not start this quiz.', 'Tidak dapat memulai kuis ini.')
        throw new Error(message)
      }
      if (typeof result !== 'object' || result === null || !('attemptId' in result) || typeof result.attemptId !== 'string') {
        throw new Error(t('The server returned an invalid quiz attempt.', 'Server mengirim sesi kuis yang tidak valid.'))
      }
      if (active) setAttemptId(result.attemptId)
    }).catch((error: unknown) => {
      if (active) setAttemptError(error instanceof Error ? error.message : t('Could not start this quiz.', 'Tidak dapat memulai kuis ini.'))
    })
    return () => { active = false }
  }, [attemptId, hearts, isFinished, nodeId, superMode, t])

  const currentQuestion = questions[currentIndex]
  const currentResponse = responses[currentIndex]
  const isChecked = currentResponse?.checked ?? false
  const checkedCount = Object.values(responses).filter((response) => response.checked).length
  const progressPercent = Math.round((checkedCount / questions.length) * 100)
  const correctOptionIds = correctOptionIdsByQuestion[currentIndex] ?? []
  const selectedOptionIds = currentResponse?.selectedOptionIds ?? []
  const isAnswerCorrect = selectedOptionIds.length === correctOptionIds.length
    && selectedOptionIds.every((optionId) => correctOptionIds.includes(optionId))
  const score = questions.reduce((total, question, index) => {
    const response = responses[index]
    return total + (response?.checked && response.isCorrect ? 1 : 0)
  }, 0)

  const selectAnswer = (optionId: string) => {
    if (isChecked) return
    const supportsMultipleAnswers = currentQuestion.allowsMultipleAnswers === true
    const selected = new Set(currentResponse?.selectedOptionIds ?? [])
    if (supportsMultipleAnswers && selected.has(optionId)) selected.delete(optionId)
    else if (supportsMultipleAnswers) selected.add(optionId)
    else {
      selected.clear()
      selected.add(optionId)
    }
    setResponses((previous) => ({
      ...previous,
      [currentIndex]: { selectedOptionIds: [...selected], checked: false }
    }))
  }

  const checkAnswer = async () => {
    if (!selectedOptionIds.length || isChecked || isSubmittingAnswer || !attemptId) return
    setAttemptError('')
    setIsSubmittingAnswer(true)
    try {
      const response = await fetch('/api/quiz-attempt/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, questionId: currentQuestion.id, optionIds: selectedOptionIds }),
      })
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : t('Could not check this answer.', 'Tidak dapat memeriksa jawaban ini.')
        throw new Error(message)
      }
      if (!isCheckedAnswerResult(result)) {
        throw new Error(t('The server returned an invalid answer result.', 'Server mengirim hasil jawaban yang tidak valid.'))
      }
      onProfileUpdate(result.profile)
      setCorrectOptionIdsByQuestion((previous) => ({ ...previous, [currentIndex]: result.correctOptionIds }))
      setResponses((previous) => ({
        ...previous,
        [currentIndex]: { ...currentResponse, checked: true, isCorrect: result.isCorrect }
      }))
    } catch (error) {
      setAttemptError(error instanceof Error ? error.message : t('Could not check this answer.', 'Tidak dapat memeriksa jawaban ini.'))
    } finally {
      setIsSubmittingAnswer(false)
    }
  }

  const continueQuiz = () => {
    if (!isChecked) return
    if (currentIndex === questions.length - 1) {
      setIsFinished(true)
      return
    }
    setCurrentIndex((previous) => previous + 1)
  }

  if (isFinished) {
    return (
      <div className={`w-full border-2 rounded-3xl p-6 sm:p-8 shadow-sm text-center ${isBoss ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-white'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isBoss ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-500'}`}>
          {isBoss ? <Swords className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">
          {isBoss ? t('Boss defeated!', 'Bos dikalahkan!') : t('Quiz Complete!', 'Kuis Selesai!')}
        </h2>
        <p className="text-slate-500 font-bold mb-8">
          {t('You scored', 'Kamu mendapat')} {score} {t('out of', 'dari')} {questions.length}
        </p>
        <button
          type="button"
          onClick={() => onComplete(attemptId)}
          className="flex w-full items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl border-b-4 border-indigo-800 transition-all active:border-b-0 active:translate-y-1"
        >
          {t('Finish', 'Selesai')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      {attemptError && (
        <div role="alert" className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          <p>{attemptError}</p>
          {hearts <= 0 && !superMode && (
            <button
              type="button"
              disabled={isActivatingSuperMode}
              onClick={() => void handleActivateSuperMode()}
              className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 font-extrabold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isActivatingSuperMode ? t('Activating…', 'Mengaktifkan…') : t('Activate Super Mode', 'Aktifkan Mode Super')}
            </button>
          )}
        </div>
      )}

      <div className="space-y-2 px-1">
        <div className="flex items-center justify-between text-sm font-extrabold text-slate-500">
          <span>{t('Question', 'Pertanyaan')} {currentIndex + 1} / {questions.length}</span>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600">
            {progressPercent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t('Quiz progress', 'Progres kuis')}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={checkedCount}
          className="h-2.5 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className={`rounded-3xl border-2 p-6 shadow-sm ${isBoss ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-white'}`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-sm font-extrabold text-rose-500">
            <Heart className="h-4 w-4 fill-rose-500" /> {superMode ? '∞' : hearts}
          </span>
          {isBoss && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-rose-700">
              <Swords className="h-4 w-4" /> {t('Final boss', 'Bos akhir')}
            </span>
          )}
          {!superMode && hearts <= 0 && (
            <button
              type="button"
              disabled={isActivatingSuperMode}
              onClick={() => void handleActivateSuperMode()}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"
            >
              {isActivatingSuperMode ? t('Activating…', 'Mengaktifkan…') : t('Activate Super Mode', 'Aktifkan Mode Super')}
            </button>
          )}
        </div>
        <h2 className="text-xl font-extrabold text-slate-700 mb-6">
          {currentQuestion.prompt}
        </h2>
        {correctOptionIds.length > 1 && (
          <p className="mb-4 text-sm font-bold text-slate-500">
            {t('Select all correct answers.', 'Pilih semua jawaban yang benar.')}
          </p>
        )}

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedOptionIds.includes(option.id)
            let optionStyle = 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'

            if (isChecked && correctOptionIds.includes(option.id)) {
              optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-700'
            } else if (isChecked && isSelected) {
              optionStyle = 'border-rose-500 bg-rose-50 text-rose-700'
            } else if (isSelected) {
              optionStyle = 'border-indigo-500 bg-indigo-50 text-slate-700'
            }

            return (
              <button
                type="button"
                key={option.id}
                disabled={isChecked}
                aria-pressed={isSelected}
                onClick={() => selectAnswer(option.id)}
                className={`w-full p-4 text-left border-2 border-b-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${optionStyle} disabled:cursor-default`}
              >
                <span className="w-8 h-8 shrink-0 rounded-lg border-2 border-current/20 flex items-center justify-center text-sm">
                  {index + 1}
                </span>
                <span className="flex-1">{option.text}</span>
                {isChecked && correctOptionIds.includes(option.id) && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isChecked && isSelected && !correctOptionIds.includes(option.id) && <XCircle className="w-5 h-5 text-rose-600" />}
              </button>
            )
          })}
        </div>
      </div>

      <LearningTutor
        key={currentQuestion.id}
        context={{
          kind: 'quiz',
          title,
          question: currentQuestion.prompt,
          choices: currentQuestion.options.map((option) => option.text),
          answerStatus: isChecked ? 'checked' : 'unanswered',
          selectedAnswers: isChecked
            ? currentQuestion.options.filter((option) => selectedOptionIds.includes(option.id)).map((option) => option.text)
            : [],
          correctAnswers: isChecked
            ? currentQuestion.options.filter((option) => correctOptionIds.includes(option.id)).map((option) => option.text)
            : [],
        }}
      />

      {isChecked && (
        <div
          aria-live="polite"
          className={`rounded-2xl border-2 p-4 font-extrabold ${
            isAnswerCorrect
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {isAnswerCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {isAnswerCorrect ? t('Correct!', 'Benar!') : t('Not quite', 'Belum tepat')}
          </div>
          {!isAnswerCorrect && (
            <p className="mt-1 ml-7 text-sm font-semibold">
              {t('Correct answers:', 'Jawaban yang benar:')} {currentQuestion.options.filter((option) => correctOptionIds.includes(option.id)).map((option) => option.text).join(', ')}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setCurrentIndex((previous) => previous - 1)}
          disabled={currentIndex === 0}
          className="flex-1 bg-white border-2 border-b-4 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 font-extrabold py-4 rounded-2xl transition-all active:border-b-0 active:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4"
        >
          {t('Previous', 'Sebelumnya')}
        </button>
        {isChecked ? (
          <button
            type="button"
            onClick={continueQuiz}
            className="flex flex-1 items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl border-b-4 border-indigo-800 transition-all active:border-b-0 active:translate-y-1"
          >
            {currentIndex === questions.length - 1 ? t('Finish', 'Selesai') : t('Continue', 'Lanjutkan')}
          </button>
        ) : (
          <button
            type="button"
            onClick={checkAnswer}
            disabled={!selectedOptionIds.length}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl border-b-4 border-indigo-800 transition-all active:border-b-0 active:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0 disabled:active:border-b-4"
          >
            <span className="flex w-full items-center justify-center">
              {t('Check', 'Periksa')}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
