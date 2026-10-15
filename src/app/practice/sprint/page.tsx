'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock3, Trophy, Zap } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { isAppProfile, type AppProfile } from '@/src/lib/appProfile'

type SprintQuestion = {
  id: string
  prompt: string
  allowsMultipleAnswers: boolean
  options: { id: string; text: string }[]
}
type SprintResponse = { questions: SprintQuestion[]; questionCount: number }
type SprintResult = {
  correctCount: number
  questionCount: number
  xpAwarded: number
  rewardAlreadyClaimed: boolean
  profile: AppProfile
}

function isSprintResponse(value: unknown): value is SprintResponse {
  return typeof value === 'object'
    && value !== null
    && 'questionCount' in value && value.questionCount === 10
    && 'questions' in value && Array.isArray(value.questions)
    && value.questions.every((question) =>
      typeof question === 'object'
      && question !== null
      && 'id' in question && typeof question.id === 'string'
      && 'prompt' in question && typeof question.prompt === 'string'
      && 'allowsMultipleAnswers' in question && typeof question.allowsMultipleAnswers === 'boolean'
      && 'options' in question && Array.isArray(question.options)
      && question.options.length >= 2
      && question.options.every((option: unknown) =>
        typeof option === 'object'
        && option !== null
        && 'id' in option && typeof option.id === 'string'
        && 'text' in option && typeof option.text === 'string')
    )
}

function isSprintResult(value: unknown): value is SprintResult {
  return typeof value === 'object'
    && value !== null
    && 'correctCount' in value && typeof value.correctCount === 'number'
    && 'questionCount' in value && value.questionCount === 10
    && 'xpAwarded' in value && typeof value.xpAwarded === 'number'
    && 'rewardAlreadyClaimed' in value && typeof value.rewardAlreadyClaimed === 'boolean'
    && 'profile' in value && isAppProfile(value.profile)
}

const SPRINT_TIME_SECONDS = 120

export default function RapidSprintPage() {
  const { t } = useLanguage()
  const { updateProfile } = useAuth()
  const [questions, setQuestions] = useState<SprintQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [questionIndex, setQuestionIndex] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(SPRINT_TIME_SECONDS)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [result, setResult] = useState<SprintResult | null>(null)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadSprint() {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/practice/sprint', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload: unknown = await response.json()
        if (!response.ok) throw new Error(
          typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : t('Could not load Rapid Sprint.', 'Tidak dapat memuat Tantangan Cepat.')
        )
        if (!isSprintResponse(payload)) throw new Error(t('The server returned invalid sprint data.', 'Server mengirim data tantangan yang tidak valid.'))
        setQuestions(payload.questions)
        setAnswers({})
        setQuestionIndex(0)
        setSecondsRemaining(SPRINT_TIME_SECONDS)
        setIsStarted(false)
        setIsTimedOut(false)
        setResult(null)
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : t('Could not load Rapid Sprint.', 'Tidak dapat memuat Tantangan Cepat.'))
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    void loadSprint()
    return () => controller.abort()
  }, [retryCount, t])

  useEffect(() => {
    if (!isStarted || result || isTimedOut || isSubmitting) return
    const timer = window.setInterval(() => setSecondsRemaining((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [isStarted, isSubmitting, isTimedOut, result])

  useEffect(() => {
    if (isStarted && secondsRemaining === 0 && !result) setIsTimedOut(true)
  }, [isStarted, result, secondsRemaining])

  const current = questions[questionIndex]
  const selectedOptionIds = current ? answers[current.id] ?? [] : []
  const formattedTime = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`

  const toggleOption = (optionId: string) => {
    if (!current || isSubmitting) return
    setAnswers((previous) => {
      const selected = previous[current.id] ?? []
      const next = current.allowsMultipleAnswers
        ? selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
        : [optionId]
      return { ...previous, [current.id]: next }
    })
  }

  const finishSprint = async () => {
    if (questions.length !== 10 || isSubmitting || isTimedOut) return
    setIsSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/practice/sprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((question) => ({
            questionId: question.id,
            optionIds: answers[question.id] ?? [],
          })),
        }),
      })
      const payload: unknown = await response.json()
      if (!response.ok) throw new Error(
        typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
          ? payload.error
          : t('Could not submit Rapid Sprint.', 'Tidak dapat mengirim Tantangan Cepat.')
      )
      if (!isSprintResult(payload)) throw new Error(t('The server returned invalid sprint results.', 'Server mengirim hasil tantangan yang tidak valid.'))
      setResult(payload)
      updateProfile(payload.profile)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('Could not submit Rapid Sprint.', 'Tidak dapat mengirim Tantangan Cepat.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-10 sm:px-0">
      <div>
        <Link href="/practice" className="mb-5 inline-flex items-center gap-2 rounded-lg font-extrabold text-slate-500 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">
          <ArrowLeft className="h-4 w-4" />
          {t('Back to Practice', 'Kembali ke Latihan')}
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-100 p-3 text-amber-600">
            <Zap className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl">
              {t('Rapid Sprint', 'Tantangan Cepat')}
            </h1>
            <p className="mt-1 text-sm font-bold text-amber-700">{t('10 questions · 2 minutes · +30 XP once per day', '10 soal · 2 menit · +30 XP sekali sehari')}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p role="status" className="rounded-2xl border-2 border-slate-200 bg-white p-5 font-semibold text-slate-500">
          {t('Preparing your sprint...', 'Menyiapkan tantangan...')}
        </p>
      ) : error && !result ? (
        <div role="alert" className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5">
          <p className="font-bold text-rose-700">{error}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 min-h-11 rounded-xl border-2 border-rose-300 bg-white px-4 font-extrabold text-rose-700 hover:bg-rose-100">
            {t('Try again', 'Coba lagi')}
          </button>
        </div>
      ) : questions.length < 10 ? (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-800">
            {t('Rapid Sprint needs at least 10 published quiz questions. Keep learning and try again later.', 'Tantangan Cepat memerlukan setidaknya 10 soal kuis yang dipublikasikan. Lanjutkan belajar dan coba lagi nanti.')}
          </p>
        </div>
      ) : result ? (
        <section className="rounded-3xl border-2 border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-amber-600">
            <Trophy className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-slate-800">{t('Sprint complete!', 'Tantangan selesai!')}</h2>
          <p className="mt-2 font-bold text-slate-600">
            {t(`You got ${result.correctCount} out of ${result.questionCount} correct.`, `Jawaban benar: ${result.correctCount} dari ${result.questionCount}.`)}
          </p>
          <p className="mt-2 text-lg font-extrabold text-amber-700">
            {result.xpAwarded > 0
              ? t(`+${result.xpAwarded} XP earned!`, `+${result.xpAwarded} XP didapat!`)
              : t('Today’s sprint XP was already claimed.', 'XP Tantangan Cepat hari ini sudah diklaim.')}
          </p>
          <Link href="/practice" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-3 font-extrabold text-white hover:bg-indigo-700">
            {t('Back to Practice', 'Kembali ke Latihan')}
          </Link>
        </section>
      ) : isTimedOut ? (
        <section className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-6 text-center">
          <h2 className="text-xl font-extrabold text-rose-800">{t('Time is up!', 'Waktu habis!')}</h2>
          <p className="mt-2 font-semibold text-rose-700">{t('No XP was awarded. You can try another sprint.', 'XP tidak diberikan. Kamu bisa mencoba tantangan lagi.')}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-5 font-extrabold text-white hover:bg-indigo-700">
            {t('Try again', 'Coba lagi')}
          </button>
        </section>
      ) : !isStarted ? (
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-6">
          <h2 className="text-xl font-extrabold text-slate-800">{t('Ready for a quick challenge?', 'Siap untuk tantangan cepat?')}</h2>
          <p className="mt-2 font-semibold leading-relaxed text-slate-500">
            {t(
              'Answer 10 questions before the timer runs out. Earn 30 XP for completing the sprint, once per Jakarta calendar day.',
              'Jawab 10 soal sebelum waktu habis. Dapatkan 30 XP setelah menyelesaikan tantangan, sekali per hari kalender Jakarta.'
            )}
          </p>
          <button type="button" onClick={() => setIsStarted(true)} className="mt-5 min-h-12 rounded-xl border-b-4 border-amber-800 bg-amber-500 px-5 py-3 font-extrabold text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">
            {t('Start sprint', 'Mulai tantangan')}
          </button>
        </section>
      ) : current ? (
        <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="font-extrabold text-slate-600">
              {t(`Question ${questionIndex + 1} of 10`, `Soal ${questionIndex + 1} dari 10`)}
            </p>
            <p className={`inline-flex items-center gap-2 rounded-full px-3 py-2 font-extrabold tabular-nums ${secondsRemaining <= 20 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`} aria-live="polite">
              <Clock3 className="h-4 w-4" /> {formattedTime}
            </p>
          </div>
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={questionIndex}>
            <div className="h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${questionIndex / 10 * 100}%` }} />
          </div>
          <h2 className="text-xl font-extrabold leading-relaxed text-slate-800">{current.prompt}</h2>
          {current.allowsMultipleAnswers && <p className="mt-2 text-sm font-semibold text-slate-500">{t('Select all correct answers.', 'Pilih semua jawaban yang benar.')}</p>}
          <div className="mt-5 space-y-3">
            {current.options.map((option, index) => {
              const selected = selectedOptionIds.includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleOption(option.id)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 ${selected ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-700 hover:border-amber-200 hover:bg-slate-50'}`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-current text-sm">{String.fromCharCode(65 + index)}</span>
                  <span>{option.text}</span>
                </button>
              )
            })}
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
          <button
            type="button"
            disabled={selectedOptionIds.length === 0 || isSubmitting}
            onClick={() => {
              if (questionIndex === 9) void finishSprint()
              else setQuestionIndex((index) => index + 1)
            }}
            className="mt-5 min-h-12 w-full rounded-xl border-b-4 border-amber-800 bg-amber-500 px-5 py-3 font-extrabold text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isSubmitting ? t('Submitting...', 'Mengirim...') : questionIndex === 9 ? t('Finish sprint', 'Selesaikan tantangan') : t('Continue', 'Lanjutkan')}
          </button>
        </section>
      ) : null}
    </div>
  )
}
