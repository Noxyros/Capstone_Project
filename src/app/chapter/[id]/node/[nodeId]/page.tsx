'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CheckCircle2, Heart, Infinity as InfinityIcon, X, XCircle, Trophy } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { LearningTutor } from '@/src/components/shared/LearningTutor'
import { loadCurriculum, saveNodeProgress } from '@/src/lib/curriculumClient'
import type { CurriculumNode } from '@/src/lib/teacherContent'
import { useUser } from '@/src/context/UserContext'

type QuizOption = {
  id: string
  text: string
  isCorrect: boolean
}

type QuizQuestion = {
  id: string
  prompt: string
  options: QuizOption[]
}

type LessonContent =
  | { kind: 'text'; value: string }
  | { kind: 'poster'; src: string; alt: string }
  | { kind: 'material'; src: string; format: 'pdf' | 'ebook' }

type NodeData =
  | { type: 'lesson'; title: string; content: LessonContent }
  | { type: 'quiz'; title: string; questions: QuizQuestion[] }

export default function NodeActivityPage() {
  const { t } = useLanguage()
  const { hearts, unlimitedHearts } = useUser()
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
    void loadCurriculum()
      .then((subjects) => {
        const node: CurriculumNode | undefined = subjects
          .flatMap((subject) => subject.chapters)
          .find((chapter) => chapter.id === chapterId)
          ?.nodes.find((item) => item.id === nodeId)
        if (!active) return
        if (!node) {
          setLoadError(t('This learning activity is unavailable.', 'Aktivitas belajar ini tidak tersedia.'))
          return
        }
        setNodeData(node.type === 'quiz'
          ? { type: 'quiz', title: node.title, questions: node.questions }
          : {
            type: 'lesson',
            title: node.title,
            content: node.contentType === 'text' || !node.resourceUrl
              ? { kind: 'text', value: node.content || t('This lesson has no content yet.', 'Materi pelajaran ini belum tersedia.') }
              : node.contentType === 'poster'
                ? { kind: 'poster', src: node.resourceUrl, alt: node.title }
                : {
                  kind: 'material',
                  src: node.resourceUrl,
                  format: node.resourceUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'ebook',
                },
          })
      })
      .catch((error) => {
        console.error('Failed to load learning activity.', error)
        if (active) setLoadError(error instanceof Error ? error.message : t('Could not load this activity.', 'Tidak dapat memuat aktivitas ini.'))
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [chapterId, nodeId])

  useEffect(() => {
    if (!isExitDialogOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExitDialogOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isExitDialogOpen])

  const completeActivity = async (score?: number) => {
    setProgressError('')
    try {
      await saveNodeProgress(nodeId, score)
      router.push(`/chapter/${chapterId}`)
    } catch (error) {
      console.error('Failed to save completed activity.', error)
      setProgressError(error instanceof Error ? error.message : t('Could not save your progress. Please try again.', 'Tidak dapat menyimpan progres. Silakan coba lagi.'))
    }
  }

  const requestExit = () => {
    if (nodeData?.type === 'quiz') {
      setIsExitDialogOpen(true)
      return
    }
    void completeActivity()
  }

  if (isLoading) return <p role="status" className="p-8 text-center font-bold text-slate-500">{t('Loading activity…', 'Memuat aktivitas…')}</p>
  if (loadError || !nodeData) return <p role="alert" className="p-8 text-center font-bold text-rose-700">{loadError || t('This activity is unavailable.', 'Aktivitas ini tidak tersedia.')}</p>

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
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
        <div className={`mt-4 ${nodeData.type === 'quiz' ? 'hidden md:block' : ''}`}>
          <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-indigo-600 md:order-2">
            {nodeData.type === 'lesson' ? t('Lesson', 'Pelajaran') : t('Quiz', 'Kuis')}
          </span>
          <h1 className="mt-1 truncate text-xl font-extrabold leading-tight text-slate-700">{nodeData.title}</h1>
        </div>
      </div>

      {progressError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{progressError}</p>}

      <div className="flex flex-1 flex-col justify-center">
        {nodeData.type === 'lesson' ? (
          <LessonActivity title={nodeData.title} content={nodeData.content} onComplete={() => { void completeActivity() }} />
        ) : (
          <QuizActivity title={nodeData.title} questions={nodeData.questions} onComplete={(score) => { void completeActivity(score) }} />
        )}
      </div>

      {isExitDialogOpen && (
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
        </div>
      )}
    </div>
  )
}

function LessonActivity({ title, content, onComplete }: { title: string; content: LessonContent; onComplete: () => void }) {
  const { t } = useLanguage()
  const mediaNote = content.kind === 'text'
    ? ''
    : t(
      'The linked poster or document is not readable by the tutor yet. Describe the part you want help with.',
      'Tutor belum dapat membaca poster atau dokumen yang ditautkan. Jelaskan bagian yang ingin kamu tanyakan.'
    )

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
          <div className="space-y-3">
            <iframe
              src={content.src}
              title={content.format === 'pdf' ? t('PDF material', 'Materi PDF') : t('E-book material', 'Materi e-book')}
              className="w-full h-[65vh] min-h-96 rounded-2xl border-2 border-slate-200 bg-slate-50"
            />
            <a
              href={content.src}
              target="_blank"
              rel="noreferrer"
              className="inline-flex font-bold text-slate-700 underline underline-offset-4"
            >
              {t('Open material in a new tab', 'Buka materi di tab baru')}
            </a>
          </div>
        )}
      </div>

      <LearningTutor
        context={{
          kind: 'lesson',
          title,
          content: content.kind === 'text' ? content.value : '',
          mediaNote,
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
}

function QuizActivity({ title, questions, onComplete }: { title: string; questions: QuizQuestion[]; onComplete: (score?: number) => void }) {
  const { t } = useLanguage()
  const { unlimitedHearts, setHearts } = useUser()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<number, QuizResponse>>({})
  const [isFinished, setIsFinished] = useState(false)

  const currentQuestion = questions[currentIndex]
  const currentResponse = responses[currentIndex]
  const isChecked = currentResponse?.checked ?? false
  const checkedCount = Object.values(responses).filter((response) => response.checked).length
  const progressPercent = Math.round((checkedCount / questions.length) * 100)
  const correctOptionIds = currentQuestion.options.filter((option) => option.isCorrect).map((option) => option.id)
  const selectedOptionIds = currentResponse?.selectedOptionIds ?? []
  const isAnswerCorrect = selectedOptionIds.length === correctOptionIds.length
    && selectedOptionIds.every((optionId) => correctOptionIds.includes(optionId))
  const score = questions.reduce((total, question, index) => {
    const response = responses[index]
    const correctIds = question.options.filter((option) => option.isCorrect).map((option) => option.id)
    const selectedIds = response?.selectedOptionIds ?? []
    const isCorrect = selectedIds.length === correctIds.length
      && selectedIds.every((optionId) => correctIds.includes(optionId))
    return total + (response?.checked && isCorrect ? 1 : 0)
  }, 0)

  const selectAnswer = (optionId: string) => {
    if (isChecked) return
    const supportsMultipleAnswers = currentQuestion.options.filter((option) => option.isCorrect).length > 1
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

  const checkAnswer = () => {
    if (!selectedOptionIds.length || isChecked) return
    const answerIsCorrect = selectedOptionIds.length === correctOptionIds.length
      && selectedOptionIds.every((optionId) => correctOptionIds.includes(optionId))
    if (!answerIsCorrect && !unlimitedHearts) {
      setHearts((currentHearts) => Math.max(0, currentHearts - 1))
    }
    setResponses((previous) => ({
      ...previous,
      [currentIndex]: { ...currentResponse, checked: true }
    }))
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
      <div className="w-full bg-white border-2 border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
        <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">{t('Quiz Complete!', 'Kuis Selesai!')}</h2>
        <p className="text-slate-500 font-bold mb-8">
          {t('You scored', 'Kamu mendapat')} {score} {t('out of', 'dari')} {questions.length}
        </p>
        <button
          type="button"
          onClick={() => onComplete(Math.round((score / questions.length) * 100))}
          className="flex w-full items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl border-b-4 border-indigo-800 transition-all active:border-b-0 active:translate-y-1"
        >
          {t('Finish', 'Selesai')}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
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

      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
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

            if (isChecked && option.isCorrect) {
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
                {isChecked && option.isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {isChecked && isSelected && !option.isCorrect && <XCircle className="w-5 h-5 text-rose-600" />}
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
            ? currentQuestion.options.filter((option) => option.isCorrect).map((option) => option.text)
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
              {t('Correct answers:', 'Jawaban yang benar:')} {currentQuestion.options.filter((option) => option.isCorrect).map((option) => option.text).join(', ')}
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
