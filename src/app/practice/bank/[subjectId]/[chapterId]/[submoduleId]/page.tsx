'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock3, History, LayoutGrid, RotateCcw, Swords, Trash2, X, Trophy } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { normalizeAnswerOptionMath, normalizeMarkdownMath } from '@/src/lib/markdownMath'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { LearningTutor } from '@/src/components/shared/LearningTutor'
import AppLoadingScreen from '@/src/components/shared/AppLoadingScreen'
import QuestionImage from '@/src/components/shared/QuestionImage'

type BankQuestion = {
  id: string
  prompt: string
  imageUrl?: string | null
  imageAlt?: string | null
  allowsMultipleAnswers: boolean
  options: { id: string; text: string }[]
}

type BankNode = {
  id: string
  title: string
  chapter: { id: string; title: string }
  submodule: { id: string; title: string } | null
}

type BankChapter = {
  id: string
  title: string
  chapter: { id: string; title: string }
  submodule: { id: string; title: string } | null
}

type BankChallenge = {
  attemptId?: string
  questions: BankQuestion[]
  questionCount: number
  questionPoolSize?: number
  node: BankChapter
  timerSeconds: number
  xpReward: number
  gemsReward: number
}

type BankResult = {
  correctCount: number
  questionCount: number
  xpAwarded: number
  gemsAwarded: number
  rewardAlreadyClaimed: boolean
  questionResults: { questionId: string; isCorrect: boolean; correctOptionIds: string[] }[]
  profile: any
}

type QuestionResult = {
  questionId: string
  isCorrect: boolean
  correctOptionIds: string[]
  selectedOptionIds: string[]
}

type BankReviewSnapshot = {
  challenge: BankChallenge
  questionResults: QuestionResult[]
}

type BankAttempt = BankReviewSnapshot & {
  id: string
  completedAt: string | null
  correctCount: number
  xpAwarded: number
  gemsAwarded: number
}

type PendingHistoryAction =
  | { kind: 'delete'; attemptId: string; attemptNumber: number }
  | { kind: 'clear' }

type ViewMode = 'challenge' | 'result' | 'review' | 'history'

const COMPLETED_KEY = 'questly_bank_completed'
const REVIEW_KEY = 'questly_bank_review'
const ATTEMPTS_KEY = 'questly_bank_attempts'
const MAX_BANK_ATTEMPTS = 10

function getCompletedKey(userId: string): string {
  return `${COMPLETED_KEY}_${userId}`
}

function getAttemptsKey(userId: string, submoduleId: string): string {
  return `${ATTEMPTS_KEY}_${userId}_${submoduleId}`
}

function getLegacyReviewKey(userId: string, submoduleId: string): string {
  return `${REVIEW_KEY}_${userId}_${submoduleId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBankQuestion(value: unknown): value is BankQuestion {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.prompt === 'string'
    && (!('imageUrl' in value) || value.imageUrl === null || typeof value.imageUrl === 'string')
    && (!('imageAlt' in value) || value.imageAlt === null || typeof value.imageAlt === 'string')
    && typeof value.allowsMultipleAnswers === 'boolean'
    && Array.isArray(value.options)
    && value.options.every((option) =>
      isRecord(option) && typeof option.id === 'string' && typeof option.text === 'string',
    )
}

function isBankChallenge(value: unknown): value is BankChallenge {
  if (!isRecord(value) || !isRecord(value.node) || !isRecord(value.node.chapter)) return false
  const submodule = value.node.submodule
  return typeof value.questionCount === 'number'
    && (!('attemptId' in value) || typeof value.attemptId === 'string')
    && (!('questionPoolSize' in value) || (
      typeof value.questionPoolSize === 'number'
      && value.questionPoolSize >= value.questionCount
    ))
    && Array.isArray(value.questions)
    && value.questions.every(isBankQuestion)
    && typeof value.node.id === 'string'
    && typeof value.node.title === 'string'
    && typeof value.node.chapter.id === 'string'
    && typeof value.node.chapter.title === 'string'
    && (submodule === null || (
      isRecord(submodule)
      && typeof submodule.id === 'string'
      && typeof submodule.title === 'string'
    ))
    && typeof value.timerSeconds === 'number'
    && typeof value.xpReward === 'number'
    && typeof value.gemsReward === 'number'
}

function isQuestionResult(value: unknown): value is QuestionResult {
  return isRecord(value)
    && typeof value.questionId === 'string'
    && typeof value.isCorrect === 'boolean'
    && Array.isArray(value.correctOptionIds)
    && value.correctOptionIds.every((id) => typeof id === 'string')
    && Array.isArray(value.selectedOptionIds)
    && value.selectedOptionIds.every((id) => typeof id === 'string')
}

function isBankResult(value: unknown): value is BankResult {
  return isRecord(value)
    && typeof value.correctCount === 'number'
    && typeof value.questionCount === 'number'
    && typeof value.xpAwarded === 'number'
    && typeof value.gemsAwarded === 'number'
    && typeof value.rewardAlreadyClaimed === 'boolean'
    && Array.isArray(value.questionResults)
    && value.questionResults.every((result) =>
      isRecord(result)
      && typeof result.questionId === 'string'
      && typeof result.isCorrect === 'boolean'
      && Array.isArray(result.correctOptionIds)
      && result.correctOptionIds.every((id) => typeof id === 'string'),
    )
}

function isBankReviewSnapshot(value: unknown): value is BankReviewSnapshot {
  if (!isRecord(value) || !isBankChallenge(value.challenge) || !Array.isArray(value.questionResults)) return false
  const questionIds = new Set(value.challenge.questions.map((question) => question.id))
  return value.questionResults.length === value.challenge.questionCount
    && value.questionResults.every((result) =>
      isQuestionResult(result) && questionIds.has(result.questionId),
    )
}

function isBankAttempt(value: unknown): value is BankAttempt {
  return isRecord(value)
    && typeof value.id === 'string'
    && (value.completedAt === null || (
      typeof value.completedAt === 'string' && !Number.isNaN(Date.parse(value.completedAt))
    ))
    && typeof value.correctCount === 'number'
    && typeof value.xpAwarded === 'number'
    && typeof value.gemsAwarded === 'number'
    && isBankReviewSnapshot(value)
}

function toLegacyAttempt(snapshot: BankReviewSnapshot): BankAttempt {
  return {
    ...snapshot,
    id: 'legacy',
    completedAt: null,
    correctCount: snapshot.questionResults.filter((result) => result.isCorrect).length,
    xpAwarded: 0,
    gemsAwarded: 0,
  }
}

function getBankAttempts(userId: string, submoduleId: string): BankAttempt[] {
  if (!userId || typeof window === 'undefined') return []
  try {
    const rawAttempts = localStorage.getItem(getAttemptsKey(userId, submoduleId))
    if (rawAttempts) {
      const attempts: unknown = JSON.parse(rawAttempts)
      if (Array.isArray(attempts)) {
        const validAttempts = attempts.filter(isBankAttempt)
        if (validAttempts.length !== attempts.length) {
          console.error('Some saved bank challenge attempts were invalid and could not be loaded.')
        }
        const recentAttempts = validAttempts.slice(0, MAX_BANK_ATTEMPTS)
        if (recentAttempts.length !== validAttempts.length) {
          try {
            localStorage.setItem(getAttemptsKey(userId, submoduleId), JSON.stringify(recentAttempts))
          } catch (error) {
            console.error('Failed to limit saved bank challenge history.', error)
          }
        }
        return recentAttempts
      }
      console.error('Saved bank challenge history was invalid and could not be loaded.')
      return []
    }

    const legacyRaw = localStorage.getItem(getLegacyReviewKey(userId, submoduleId))
    if (!legacyRaw) return []
    const legacySnapshot: unknown = JSON.parse(legacyRaw)
    return isBankReviewSnapshot(legacySnapshot) ? [toLegacyAttempt(legacySnapshot)] : []
  } catch (error) {
    console.error('Failed to load saved bank challenge history.', error)
    return []
  }
}

function saveBankAttempt(userId: string, submoduleId: string, attempt: BankAttempt): BankAttempt[] | null {
  if (!userId || typeof window === 'undefined') return null
  try {
    const attempts = [attempt, ...getBankAttempts(userId, submoduleId)].slice(0, MAX_BANK_ATTEMPTS)
    localStorage.setItem(getAttemptsKey(userId, submoduleId), JSON.stringify(attempts))
    return attempts
  } catch (error) {
    console.error('Failed to save bank challenge history.', error)
    return null
  }
}

function removeBankAttempt(userId: string, submoduleId: string, attemptId: string): BankAttempt[] | null {
  if (!userId || typeof window === 'undefined') return null
  try {
    const attempts = getBankAttempts(userId, submoduleId).filter((attempt) => attempt.id !== attemptId)
    localStorage.setItem(getAttemptsKey(userId, submoduleId), JSON.stringify(attempts))
    localStorage.removeItem(getLegacyReviewKey(userId, submoduleId))
    if (attempts.length === 0) removeCompletedSubmodule(userId, submoduleId)
    return attempts
  } catch (error) {
    console.error('Failed to delete saved bank challenge attempt.', error)
    return null
  }
}

function clearBankAttempts(userId: string, submoduleId: string): BankAttempt[] | null {
  if (!userId || typeof window === 'undefined') return null
  try {
    localStorage.setItem(getAttemptsKey(userId, submoduleId), JSON.stringify([]))
    localStorage.removeItem(getLegacyReviewKey(userId, submoduleId))
    removeCompletedSubmodule(userId, submoduleId)
    return []
  } catch (error) {
    console.error('Failed to clear saved bank challenge history.', error)
    return null
  }
}

function getCompletedSubmodules(userId: string): Set<string> {
  if (!userId || typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(getCompletedKey(userId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function markSubmoduleCompleted(userId: string, submoduleId: string): void {
  if (!userId || typeof window === 'undefined') return
  const completed = getCompletedSubmodules(userId)
  completed.add(submoduleId)
  try {
    localStorage.setItem(getCompletedKey(userId), JSON.stringify([...completed]))
  } catch {
    // ignore
  }
}

function removeCompletedSubmodule(userId: string, submoduleId: string): void {
  if (!userId || typeof window === 'undefined') return
  const completed = getCompletedSubmodules(userId)
  completed.delete(submoduleId)
  try {
    localStorage.setItem(getCompletedKey(userId), JSON.stringify([...completed]))
  } catch (error) {
    console.error('Failed to update Question Bank completion status after deleting history.', error)
  }
}

export default function BankChallengePage() {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const params = useParams<{ subjectId: string; chapterId: string; submoduleId: string }>()
  const subjectId = params.subjectId
  const chapterId = params.chapterId
  const submoduleId = params.submoduleId
  const router = useRouter()
  const submoduleListHref = `/practice/bank/${subjectId}/${chapterId}`

  const [challenge, setChallenge] = useState<BankChallenge | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('challenge')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([])
  const [attempts, setAttempts] = useState<BankAttempt[]>([])
  const [pendingHistoryAction, setPendingHistoryAction] = useState<PendingHistoryAction | null>(null)
  const [reviewReturnMode, setReviewReturnMode] = useState<'result' | 'history'>('result')
  const [secondsRemaining, setSecondsRemaining] = useState(120)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<BankResult | null>(null)
  const [error, setError] = useState('')
  const [showJumpGrid, setShowJumpGrid] = useState(false)
  const timerRef = useRef<number | null>(null)
  const autoSubmittedRef = useRef(false)

  // ---------- Load challenge ----------
  const loadChallenge = useCallback(async () => {
    setIsLoading(true)
    setError('')
    setChallenge(null)
    try {
      const response = await fetch(`/api/practice/bank/challenge/${submoduleId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(t('Could not load challenge.', 'Tidak dapat memuat tantangan.'))
      const data: unknown = await response.json()
      if (!isBankChallenge(data) || data.questions.length === 0 || typeof data.attemptId !== 'string') {
        throw new Error(t('No questions available.', 'Tidak ada soal yang tersedia.'))
      }
      setChallenge(data)
      setAnswers({})
      setCurrentIndex(0)
      setSecondsRemaining(data.timerSeconds || 120)
      setViewMode('challenge')
    } catch (loadError) {
      console.error('Failed to load bank challenge.', loadError)
      setError(loadError instanceof Error ? loadError.message : t('Could not load challenge.', 'Tidak dapat memuat tantangan.'))
    } finally {
      setIsLoading(false)
    }
  }, [submoduleId, t])

  useEffect(() => {
    if (!user?.id || !submoduleId) {
      setIsLoading(false)
      return
    }

    const savedAttempts = getBankAttempts(user.id, submoduleId)
    setAttempts(savedAttempts)
    const historyRequested = new URLSearchParams(window.location.search).get('view') === 'history'
    if (historyRequested) {
      setViewMode('history')
      setIsLoading(false)
      return
    }

    setViewMode('challenge')
    void loadChallenge()
  }, [user?.id, submoduleId, loadChallenge])

  // ---------- Timer ----------
  useEffect(() => {
    if (viewMode !== 'challenge' || !challenge) return
    timerRef.current = window.setInterval(() => {
      setSecondsRemaining((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [viewMode, challenge])

  // ---------- Auto-submit when time is up ----------
  useEffect(() => {
    if (viewMode === 'challenge' && secondsRemaining === 0 && challenge && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true
      setShowJumpGrid(false)
      void submitChallenge()
    }
  }, [viewMode, secondsRemaining, challenge])

  // ---------- Derived ----------
  const currentQuestion = challenge?.questions[currentIndex]
  const selectedOptionIds = currentQuestion ? answers[currentQuestion.id] ?? [] : []
  const answeredCount = challenge?.questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length ?? 0
  const allAnswered = challenge ? challenge.questions.every((q) => answers[q.id]?.length > 0) : false
  const isLastQuestion = challenge ? currentIndex === challenge.questionCount - 1 : false
  const isLowTime = secondsRemaining <= 20

  const committedCount = challenge?.questions.filter((q) => (answers[q.id]?.length ?? 0) > 0).length ?? 0
  const progressPercent = challenge ? Math.round((committedCount / challenge.questionCount) * 100) : 0

  // ---------- Actions ----------
  const toggleOption = (optionId: string) => {
    if (!currentQuestion || viewMode !== 'challenge') return
    setAnswers((previous) => {
      const selected = previous[currentQuestion.id] ?? []
      const next = currentQuestion.allowsMultipleAnswers
        ? selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
        : [optionId]
      return { ...previous, [currentQuestion.id]: next }
    })
  }

  const commitCurrent = () => {
    if (!currentQuestion) return
    if ((answers[currentQuestion.id]?.length ?? 0) > 0) {
      // committed state removed - no-op
    }
  }

  const goToQuestion = (index: number) => {
    if (!challenge || index < 0 || index >= challenge.questions.length || viewMode !== 'challenge') return
    commitCurrent()
    setCurrentIndex(index)
    setShowJumpGrid(false)
  }

  const nextQuestion = () => {
    if (!challenge || currentIndex >= challenge.questions.length - 1) return
    commitCurrent()
    setCurrentIndex((i) => i + 1)
  }

  const prevQuestion = () => {
    if (currentIndex <= 0 || viewMode !== 'challenge') return
    commitCurrent()
    setCurrentIndex((i) => i - 1)
  }

  const submitChallenge = async () => {
    if (!challenge || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      if (!challenge.attemptId) {
        throw new Error(t('This challenge attempt is no longer available. Please start a new challenge.', 'Percobaan tantangan ini sudah tidak tersedia. Silakan mulai tantangan baru.'))
      }
      const answersArray = challenge.questions.map((q) => ({
        questionId: q.id,
        optionIds: answers[q.id] ?? [],
      }))
      const response = await fetch(`/api/practice/bank/challenge/${submoduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: challenge.attemptId, answers: answersArray }),
      })
      const payload: unknown = await response.json()
      if (!response.ok) {
        throw new Error(
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error?: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : t('Could not submit challenge.', 'Tidak dapat mengirim tantangan.'),
        )
      }
      if (!isBankResult(payload)) {
        throw new Error(t('Invalid result data.', 'Data hasil tidak valid.'))
      }
      setResult(payload)

      if (user?.id) {
        const savedAttempts = saveBankAttempt(user.id, submoduleId, {
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
          completedAt: new Date().toISOString(),
          correctCount: payload.correctCount,
          xpAwarded: payload.xpAwarded,
          gemsAwarded: payload.gemsAwarded,
          challenge,
          questionResults: payload.questionResults.map((questionResult) => ({
            ...questionResult,
            selectedOptionIds: answers[questionResult.questionId] ?? [],
          })),
        })
        if (!savedAttempts) {
          setError(t(
            'Your result was submitted, but this device could not save your attempt history.',
            'Hasil berhasil dikirim, tetapi perangkat ini tidak dapat menyimpan riwayat percobaanmu.',
          ))
        } else {
          setAttempts(savedAttempts)
        }
        markSubmoduleCompleted(user.id, submoduleId)
      }

      setViewMode('result')
    } catch (submitError) {
      console.error('Failed to submit bank challenge.', submitError)
      autoSubmittedRef.current = false
      setError(submitError instanceof Error ? submitError.message : t('Could not submit challenge.', 'Tidak dapat mengirim tantangan.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const startNewChallenge = () => {
    setResult(null)
    setQuestionResults([])
    setCurrentIndex(0)
    setAnswers({})
    setShowJumpGrid(false)
    autoSubmittedRef.current = false
    setViewMode('challenge')
    void loadChallenge()
  }

  const reviewSavedAttempt = (attempt: BankAttempt) => {
    setChallenge(attempt.challenge)
    setQuestionResults(attempt.questionResults)
    setReviewReturnMode('history')
    setCurrentIndex(0)
    setViewMode('review')
  }

  const requestDeleteSavedAttempt = (attempt: BankAttempt, attemptNumber: number) => {
    if (!user?.id) return
    setPendingHistoryAction({ kind: 'delete', attemptId: attempt.id, attemptNumber })
  }

  const requestClearSavedAttempts = () => {
    if (!user?.id) return
    setPendingHistoryAction({ kind: 'clear' })
  }

  const confirmHistoryAction = () => {
    if (!user?.id || !pendingHistoryAction) return
    const action = pendingHistoryAction
    const updatedAttempts = action.kind === 'delete'
      ? removeBankAttempt(user.id, submoduleId, action.attemptId)
      : clearBankAttempts(user.id, submoduleId)
    setPendingHistoryAction(null)
    if (!updatedAttempts) {
      setError(action.kind === 'delete'
        ? t('Could not delete this attempt.', 'Tidak dapat menghapus percobaan ini.')
        : t('Could not clear attempt history.', 'Tidak dapat menghapus riwayat percobaan.'))
      return
    }
    setAttempts(updatedAttempts)
    setError('')
  }

  const startReview = () => {
    if (!result || !challenge) return
    const results: QuestionResult[] = result.questionResults.map((qr) => ({
      questionId: qr.questionId,
      isCorrect: qr.isCorrect,
      correctOptionIds: qr.correctOptionIds,
      selectedOptionIds: answers[qr.questionId] ?? [],
    }))
    setQuestionResults(results)
    setReviewReturnMode('result')
    setError('')
    setViewMode('review')
    setCurrentIndex(0)
  }

  // ---------- Keyboard shortcuts ----------
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (viewMode !== 'challenge' || !currentQuestion) return
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

    if (e.key === 'Escape') {
      setShowJumpGrid(false)
      return
    }
    if (showJumpGrid) return

    if (/^[1-9]$/.test(e.key)) {
      const option = currentQuestion.options[Number(e.key) - 1]
      if (option) {
        e.preventDefault()
        toggleOption(option.id)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (viewMode === 'challenge') {
        if (allAnswered && isLastQuestion) {
          void submitChallenge()
        } else if (selectedOptionIds.length > 0) {
          void commitCurrent()
          void nextQuestion()
        }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextQuestion()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevQuestion()
    }
  }

  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  useEffect(() => {
    if (!pendingHistoryAction) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingHistoryAction(null)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [pendingHistoryAction])

  const formattedTime = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`
  const questionPoolSize = challenge?.questionPoolSize ?? challenge?.questionCount ?? 0
  const challengeQuestionNote = challenge && challenge.questionCount < questionPoolSize
    ? t(
      `This challenge randomly selects ${challenge.questionCount} of ${questionPoolSize} questions from this bank.`,
      `Tantangan ini memilih ${challenge.questionCount} dari ${questionPoolSize} soal bank ini secara acak.`,
    )
    : t(
      `This challenge includes all ${challenge?.questionCount ?? 0} available questions.`,
      `Tantangan ini mencakup semua ${challenge?.questionCount ?? 0} soal yang tersedia.`,
    )

  // ---------- Shared header pieces ----------
  const BackHeader = (
    <div className="flex items-center gap-4 mb-8">
      <button
        type="button"
        onClick={() => router.push(submoduleListHref)}
        aria-label={t('Back', 'Kembali')}
        className="p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl transition"
      >
        <ArrowLeft className="h-5 w-5 text-slate-600" />
      </button>
      <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('Challenge', 'Tantangan')}</h1>
    </div>
  )

  const TopBar = (
    <div className="flex items-center justify-between gap-4">
      <div className="inline-flex items-center rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-extrabold text-rose-500 shadow-sm">
        {t('Challenge', 'Tantangan')}
      </div>
      <button
        type="button"
        onClick={() => router.push(submoduleListHref)}
        aria-label={t('Back', 'Kembali')}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
      >
        <X className="h-5 w-5 stroke-[2.5]" />
      </button>
    </div>
  )

  // ---------- Loading / error / empty ----------
  if (isLoading) {
    return <AppLoadingScreen message={t('Preparing your challenge…', 'Menyiapkan tantanganmu…')} />
  }

  if (error && !challenge) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
        {BackHeader}
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-bold text-rose-700">{error}</p>
          <button
            type="button"
            onClick={startNewChallenge}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-4 py-2 font-extrabold text-rose-700 hover:bg-rose-100"
          >
            <RotateCcw className="h-4 w-4" />
            {t('Try again', 'Coba lagi')}
          </button>
          {attempts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setError('')
                setViewMode('history')
              }}
              className="ml-2 mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-4 py-2 font-extrabold text-rose-700 hover:bg-rose-100"
            >
              <History className="h-4 w-4" />
              {t('Attempt history', 'Riwayat percobaan')}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!challenge && viewMode !== 'history') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
        {BackHeader}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-6 w-6 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-emerald-800">{t('No questions available', 'Tidak ada soal tersedia')}</h2>
          </div>
          <p className="mt-2 font-semibold leading-relaxed text-emerald-700">
            {t('This submodule has no questions yet.', 'Submodul ini belum memiliki soal.')}
          </p>
        </div>
      </div>
    )
  }

  // ---------- Attempt history ----------
  if (viewMode === 'history') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href={submoduleListHref}
            aria-label={t('Back', 'Kembali')}
            className="p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-emerald-600">
              <History className="h-5 w-5" />
              <span className="text-sm font-extrabold uppercase tracking-wide">
                {t('Question Bank', 'Bank Soal')}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-black text-slate-800">
              {t('Attempt history', 'Riwayat percobaan')}
            </h1>
          </div>
        </div>

        {attempts[0] && (
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-800">
              {attempts[0].challenge.node.chapter.title} · {attempts[0].challenge.node.submodule?.title}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {t(
                'Each retry gets a fresh random set. Your reviews stay saved here.',
                'Setiap percobaan ulang mendapat kumpulan soal acak yang baru. Tinjauanmu tersimpan di sini.',
              )}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        )}

        {attempts.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold text-slate-500">
              {t(
                `Keeping the ${MAX_BANK_ATTEMPTS} most recent attempts on this device.`,
                `Menyimpan ${MAX_BANK_ATTEMPTS} percobaan terbaru di perangkat ini.`,
              )}
            </p>
            <button
              type="button"
              onClick={requestClearSavedAttempts}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-extrabold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              {t('Clear history', 'Hapus riwayat')}
            </button>
          </div>
        )}

        {attempts.length > 0 ? (
          <div className="space-y-3">
            {attempts.map((attempt, index) => {
              const attemptNumber = attempts.length - index
              const attemptDate = attempt.completedAt
                ? new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(attempt.completedAt))
                : t('Earlier attempt', 'Percobaan sebelumnya')

              return (
                <article key={attempt.id} className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-extrabold text-slate-800">
                        {t('Attempt', 'Percobaan')} {attemptNumber}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{attemptDate}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-extrabold tabular-nums text-emerald-700">
                      {attempt.correctCount}/{attempt.challenge.questionCount}
                    </span>
                  </div>
                  {attempt.xpAwarded > 0 && (
                    <p className="mt-3 text-sm font-bold text-emerald-700">
                      +{attempt.xpAwarded} XP · +{attempt.gemsAwarded} gems
                    </p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => reviewSavedAttempt(attempt)}
                      className="flex-1 rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 font-extrabold text-emerald-700 transition-colors hover:bg-emerald-50"
                    >
                      {t('Review this attempt', 'Tinjau percobaan ini')}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteSavedAttempt(attempt, attemptNumber)}
                      aria-label={t(`Delete attempt ${attemptNumber}`, `Hapus percobaan ${attemptNumber}`)}
                      className="grid w-12 shrink-0 place-items-center rounded-xl border-2 border-rose-100 bg-white text-rose-500 transition-colors hover:border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold leading-relaxed text-emerald-800">
            {t(
              'No attempts are saved for this submodule yet. Go back and select it to start a new random set.',
              'Belum ada percobaan yang tersimpan untuk submodul ini. Kembali dan pilih submodul untuk memulai kumpulan soal acak baru.',
            )}
          </div>
        )}

        {pendingHistoryAction && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPendingHistoryAction(null)
            }}
          >
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="bank-history-confirm-title"
              aria-describedby="bank-history-confirm-description"
              className="w-full max-w-sm space-y-5 rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-rose-100 bg-rose-50">
                    <Trash2 aria-hidden="true" className="h-5 w-5 text-rose-600" />
                  </span>
                  <h2 id="bank-history-confirm-title" className="text-xl font-black text-slate-800">
                    {pendingHistoryAction.kind === 'clear'
                      ? t('Clear attempt history?', 'Hapus riwayat percobaan?')
                      : t('Delete this attempt?', 'Hapus percobaan ini?')}
                  </h2>
                </div>
                <p id="bank-history-confirm-description" className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
                  {pendingHistoryAction.kind === 'clear'
                    ? t(
                      'All saved attempts for this submodule will be removed from this device. This cannot be undone.',
                      'Semua percobaan tersimpan untuk submodul ini akan dihapus dari perangkat ini. Tindakan ini tidak dapat dibatalkan.',
                    )
                    : t(
                      `Attempt ${pendingHistoryAction.attemptNumber} and its review will be removed from this device.`,
                      `Percobaan ${pendingHistoryAction.attemptNumber} dan tinjauannya akan dihapus dari perangkat ini.`,
                    )}
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setPendingHistoryAction(null)}
                  className="flex-1 rounded-2xl border-b-4 border-slate-300 bg-slate-100 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
                >
                  {t('Cancel', 'Batal')}
                </button>
                <button
                  type="button"
                  onClick={confirmHistoryAction}
                  className="flex-1 rounded-2xl border-b-4 border-rose-800 bg-rose-600 py-3 text-sm font-extrabold text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
                >
                  {pendingHistoryAction.kind === 'clear'
                    ? t('Clear history', 'Hapus riwayat')
                    : t('Delete attempt', 'Hapus percobaan')}
                </button>
              </div>
            </section>
          </div>
        )}

      </div>
    )
  }

  // ---------- Challenge ----------
  if (viewMode === 'challenge') {
    if (!challenge) return null
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-6">
          {TopBar}
          <h1 className="mt-4 truncate text-xl font-extrabold leading-tight text-slate-700">
            {challenge.node.chapter.title} · {challenge.node.submodule?.title || t('General', 'Umum')}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">{challengeQuestionNote}</p>
        </div>

        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between text-sm font-extrabold text-slate-500">
            <span>
              {t('Question', 'Pertanyaan')} {currentIndex + 1} / {challenge.questionCount}
            </span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600">{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label={t('Quiz progress', 'Progres tantangan')}
            aria-valuemin={0}
            aria-valuemax={challenge.questionCount}
            aria-valuenow={committedCount}
            className="h-2.5 overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="my-3 flex items-center justify-between gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 font-extrabold tabular-nums ${
              isLowTime ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <Clock3 className="h-4 w-4" /> {formattedTime}
          </div>
          <button
            type="button"
            onClick={() => setShowJumpGrid(true)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          >
            <LayoutGrid className="h-4 w-4" />
            {t('Questions', 'Soal')}
          </button>
        </div>

        <div className="mb-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/70">
          <QuestionImage src={currentQuestion?.imageUrl} alt={currentQuestion?.imageAlt} />
          <h2 className="mb-6 text-xl font-extrabold text-slate-700">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizeMarkdownMath(currentQuestion?.prompt ?? '')}
            </ReactMarkdown>
          </h2>
          {currentQuestion?.allowsMultipleAnswers && (
            <p className="mb-4 text-sm font-bold text-slate-500">{t('Select all correct answers.', 'Pilih semua jawaban yang benar.')}</p>
          )}
          <div className="space-y-3">
            {currentQuestion?.options.map((option, index) => {
              const isSelected = selectedOptionIds.includes(option.id)
              const optionStyle = isSelected
                ? 'border-indigo-400 bg-indigo-50 text-slate-700'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
              const badgeStyle = isSelected
                ? 'border-indigo-400 bg-white text-indigo-600'
                : 'border-slate-300 bg-slate-50 text-slate-600'
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-keyshortcuts={String(index + 1)}
                  onClick={() => toggleOption(option.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-4 text-left font-bold transition-all ${optionStyle}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm ${badgeStyle}`}>
                    {index + 1}
                  </span>
                  <span className="flex-1">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {normalizeAnswerOptionMath(option.text)}
                    </ReactMarkdown>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-3 rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        )}

        {isLastQuestion && !allAnswered && (
          <p className="mb-3 text-center text-sm font-bold text-slate-500">
            {t('Answer all questions to submit.', 'Jawab semua soal untuk mengirim.')} ({answeredCount}/{challenge.questionCount})
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
            className="flex-1 rounded-2xl border-2 border-b-4 border-slate-200 bg-white py-4 font-extrabold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 active:translate-y-1 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('Previous', 'Sebelumnya')}
          </button>

          {isLastQuestion ? (
            <button
              type="button"
              onClick={() => void submitChallenge()}
              disabled={!allAnswered || isSubmitting}
              className="flex flex-1 items-center justify-center rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-4 font-extrabold text-white transition-all hover:bg-indigo-700 active:translate-y-1 active:border-b-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? t('Submitting…', 'Mengirim…') : t('Submit', 'Kirim')}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextQuestion}
              className="flex flex-1 items-center justify-center rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-4 font-extrabold text-white transition-all hover:bg-indigo-700 active:translate-y-1 active:border-b-0"
            >
              {t('Next', 'Berikutnya')}
            </button>
          )}
        </div>

        {/* Question jump window */}
        {showJumpGrid && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('Jump to question', 'Lompat ke soal')}
              className="relative w-full max-w-sm rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-800">{t('Jump to question', 'Lompat ke soal')}</h2>
                <span className="text-sm font-bold text-slate-500">
                  {answeredCount}/{challenge.questionCount}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {challenge.questions.map((q, idx) => {
                  const isAnswered = (answers[q.id]?.length ?? 0) > 0
                  const isCurrent = idx === currentIndex
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      aria-label={`${t('Question', 'Pertanyaan')} ${idx + 1}${isAnswered ? ` (${t('answered', 'terjawab')})` : ''}`}
                      className={`flex aspect-square items-center justify-center rounded-xl border-2 text-sm font-extrabold transition-all ${
                        isAnswered
                          ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      } ${isCurrent ? 'ring-4 ring-indigo-200' : ''}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowJumpGrid(false)}
                className="mt-6 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-extrabold text-slate-600 hover:bg-slate-50"
              >
                {t('Close', 'Tutup')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- Result ----------
  if (viewMode === 'result') {
    if (!challenge) return null
    const resultCorrectCount = result?.correctCount ?? 0
    const perfect = resultCorrectCount === challenge.questionCount
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-5 sm:px-6 sm:py-7">
        <div
          className={`w-full rounded-3xl border-2 p-6 text-center shadow-sm sm:p-8 ${
            perfect ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-white'
          }`}
        >
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              perfect ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-500'
            }`}
          >
            {perfect ? <Swords className="h-10 w-10" /> : <Trophy className="h-10 w-10" />}
          </div>
          <h2 className="mb-2 text-2xl font-black text-slate-800">
            {perfect ? t('Boss defeated!', 'Bos dikalahkan!') : t('Challenge complete!', 'Tantangan selesai!')}
          </h2>
          <p className="mb-8 font-bold text-slate-500">
            {t('You scored', 'Kamu mendapat')} {resultCorrectCount} {t('out of', 'dari')} {challenge.questionCount}
          </p>
          <p className="mt-4 text-lg font-extrabold text-emerald-700">
            {(result?.xpAwarded ?? 0) > 0
              ? t('+{X} XP +{Y} gems earned!', '+{X} XP +{Y} gems didapat!')
                  .replace('{X}', String(result?.xpAwarded ?? 0))
                  .replace('{Y}', String(result?.gemsAwarded ?? 0))
              : t('Today’s challenge XP was already claimed.', 'XP tantangan hari ini sudah diklaim.')}
          </p>
          {error && <p role="alert" className="mt-3 rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={startReview}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 font-extrabold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              {t('Review answers', 'Tinjau jawaban')}
            </button>
            <Link
              href={submoduleListHref}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 font-extrabold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              {t('Back', 'Kembali')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Review ----------
  if (viewMode === 'review') {
    if (!challenge) return null
    const currentResult = questionResults[currentIndex]
    if (!currentResult) return null
    const currentQ = challenge.questions.find((q) => q.id === currentResult.questionId)
    const autoPrompt = currentResult.isCorrect
      ? t(
        'Explain why my answer is correct and briefly why the other options are wrong.',
        'Jelaskan mengapa jawabanku benar dan secara singkat mengapa pilihan lain salah.',
      )
      : t(
        'My answer was wrong. Explain why my selected answer is incorrect and show me the right answer with full working.',
        'Jawabanku salah. Jelaskan mengapa jawabanku salah dan tunjukkan jawaban yang benar dengan perhitungan lengkap.',
      )

    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-5 sm:px-6 sm:py-7">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="mt-4">
              <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-indigo-600 md:order-2">
                {t('Review Answers', 'Tinjau Jawaban')}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {t(
                  `This review covers the ${challenge.questionCount} questions from this attempt.`,
                  `Tinjauan ini mencakup ${challenge.questionCount} soal dari percobaan ini.`,
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode(reviewReturnMode)}
                aria-label={t('Back', 'Kembali')}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setShowJumpGrid(true)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-3 py-2 text-sm font-extrabold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
              >
                <LayoutGrid className="h-4 w-4" />
                {t('Questions', 'Soal')}
              </button>
            </div>
          </div>
        </div>

        <article className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                currentResult.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {currentResult.isCorrect ? t('Correct', 'Benar') : t('Wrong', 'Salah')}
            </span>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 px-2.5 py-1.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-indigo-200 bg-white text-sm font-black tabular-nums text-indigo-600">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="flex flex-col gap-0.5 leading-none">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('Question', 'Pertanyaan')}
                </span>
                <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                  {t('OF', 'DARI')}&#x20;{challenge.questionCount}
                </span>
              </span>
            </div>
          </div>
          <QuestionImage src={currentQ?.imageUrl} alt={currentQ?.imageAlt} />
          <h2 className="mb-6 text-xl font-extrabold leading-relaxed text-slate-800">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {normalizeMarkdownMath(currentQ?.prompt ?? '')}
            </ReactMarkdown>
          </h2>
          <div className="mt-5 space-y-3">
            {currentQ?.options.map((option, index) => {
              const isSelected = currentResult.selectedOptionIds.includes(option.id)
              const isCorrectOption = currentResult.correctOptionIds.includes(option.id)
              const isWrongSelection = isSelected && !isCorrectOption

              return (
                <div
                  key={option.id}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-4 text-left font-bold ${isCorrectOption ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : isWrongSelection ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-current/20 text-base">{index + 1}</span>
                  <span className="flex-1">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {normalizeAnswerOptionMath(option.text)}
                    </ReactMarkdown>
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="min-h-12 flex-1 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 font-extrabold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('Previous', 'Sebelumnya')}
            </button>
            {currentIndex < challenge.questionCount - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="min-h-12 flex-1 rounded-xl border-2 border-indigo-600 bg-indigo-600 px-5 py-3 font-extrabold text-white hover:bg-indigo-700"
              >
                {t('Next', 'Berikutnya')}
              </button>
            ) : (
              <Link
                href={submoduleListHref}
                aria-label={t('Back', 'Kembali')}
                title={t('Back', 'Kembali')}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-slate-200 bg-white transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
              >
                <ArrowLeft className="h-5 w-5 text-slate-600" />
              </Link>
            )}
          </div>
        </article>

        {currentQ && (
          <div className="mt-4">
            <LearningTutor
              key={currentQ.id}
              context={{
                kind: 'quiz',
                title: currentQ.prompt,
                question: currentQ.prompt,
                choices: currentQ.options.map((option) => option.text),
                answerStatus: 'checked',
                selectedAnswers: currentQ.options
                  .filter((option) => currentResult.selectedOptionIds.includes(option.id))
                  .map((option) => option.text),
                correctAnswers: currentQ.options
                  .filter((option) => currentResult.correctOptionIds.includes(option.id))
                  .map((option) => option.text),
              }}
              autoPrompt={autoPrompt}
              autoPromptOnOpen
            />
          </div>
        )}
        {/* Question jump window */}
        {showJumpGrid && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('Jump to question', 'Lompat ke soal')}
              className="relative w-full max-w-md rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-slate-800">{t('Jump to question', 'Lompat ke soal')}</h2>
                <button
                  type="button"
                  onClick={() => setShowJumpGrid(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-3">
                {challenge.questions.map((q, idx) => {
                  const qr = questionResults.find((r) => r.questionId === q.id)
                  const isCorrect = qr?.isCorrect ?? false
                  const isAnswered = (qr?.selectedOptionIds?.length ?? 0) > 0
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`${t('Question', 'Pertanyaan')} ${idx + 1}`}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-400'
                          : isAnswered
                            ? 'bg-rose-100 text-rose-700 border-rose-400'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                      } border-2`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowJumpGrid(false)}
                className="mt-6 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-extrabold text-slate-600 hover:bg-slate-50"
              >
                {t('Close', 'Tutup')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
