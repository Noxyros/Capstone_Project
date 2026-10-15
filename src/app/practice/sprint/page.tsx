'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock3, Trophy, Zap, Target, ShieldCheck, Sparkles } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { isAppProfile, type AppProfile } from '@/src/lib/appProfile'
import { playFanfareSound, playClickSound } from '@/src/lib/soundEffects'

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
    playClickSound()
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
      playFanfareSound()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('Could not submit Rapid Sprint.', 'Tidak dapat mengirim Tantangan Cepat.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (!isStarted) {
          setIsStarted(true)
        } else if (current && selectedOptionIds.length > 0 && !isSubmitting) {
          if (questionIndex === 9) {
            void finishSprint()
          } else {
            setQuestionIndex((prev) => prev + 1)
          }
        }
        return
      }

      if (isStarted && current && !result && !isTimedOut) {
        const num = parseInt(e.key, 10)
        if (!isNaN(num) && num >= 1 && num <= current.options.length) {
          e.preventDefault()
          const opt = current.options[num - 1]
          if (opt) toggleOption(opt.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isStarted, current, selectedOptionIds, isSubmitting, questionIndex, result, isTimedOut])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-10 sm:px-0">
      <div>
        <Link href="/practice" className="mb-5 inline-flex items-center gap-2 rounded-lg font-extrabold text-slate-500 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200">
          <ArrowLeft className="h-4 w-4" />
          {t('Back to Practice', 'Kembali ke Latihan')}
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-100 p-3 text-amber-600 shadow-sm">
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

      {result ? (
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
      ) : isStarted && current ? (
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
            <div className="h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${(questionIndex / 10) * 100}%` }} />
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
      ) : (
        <section className="relative overflow-hidden rounded-[32px] border-2 border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-100 sm:p-9">
          {/* Decorative subtle ambient backdrop element */}
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-amber-50/80 blur-2xl pointer-events-none" />

          {/* Header Info */}
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              {t('Timed Challenge', 'Tantangan Waktu')}
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {t('Ready to race the clock?', 'Siap beradu dengan waktu?')}
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
              {t(
                'Power through 10 quick-fire questions back-to-back. Build up your reflexes and lock in your daily XP bonus.',
                'Selesaikan 10 soal kilat berturut-turut. Asah refleks berpikirmu dan amankan bonus XP harianmu.'
              )}
            </p>
          </div>

          {/* Redesigned Human-Crafted Stats Strip */}
          <div className="relative z-10 mt-6 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border-2 border-slate-100 bg-gradient-to-b from-slate-50/50 to-slate-50/80 p-4 text-center">
            <div className="px-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('Time limit', 'Batas waktu')}</p>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-slate-800 font-black text-sm sm:text-base">
                <Clock3 className="h-4 w-4 text-amber-500 shrink-0" />
                <span>{t('2m 00s', '2m 00d')}</span>
              </div>
            </div>
            <div className="px-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('Questions', 'Jumlah soal')}</p>
              <div className="mt-1 flex items-center justify-center gap-1.5 text-slate-800 font-black text-sm sm:text-base">
                <Target className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>10</span>
              </div>
            </div>
            <div className="px-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t('Reward', 'Hadiah')}</p>
              <div className="mt-1 flex items-center justify-center gap-1 text-amber-600 font-black text-sm sm:text-base">
                <Zap className="h-4 w-4 fill-amber-500 text-amber-500 shrink-0" />
                <span>+30 XP</span>
              </div>
            </div>
          </div>

          {/* Clean Minimalist Rules List */}
          <div className="relative z-10 mt-5 space-y-2 rounded-2xl border border-slate-100 bg-white p-4 text-xs font-bold text-slate-500 sm:text-sm">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{t('Zero heart penalty — practice entirely risk-free.', 'Bebas penalti nyawa — latihan sepenuhnya tanpa risiko.')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <span>{t('Available once per Jakarta calendar day.', 'Tersedia sekali per hari kalender Jakarta.')}</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="relative z-10 mt-5 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4">
              <p className="font-bold text-rose-700 text-sm">{error}</p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-3 min-h-9 rounded-xl border border-rose-300 bg-white px-3 text-xs font-extrabold text-rose-700 hover:bg-rose-100"
              >
                {t('Try again', 'Coba lagi')}
              </button>
            </div>
          )}

          {!isLoading && !error && questions.length < 10 && (
            <div className="relative z-10 mt-5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-800">
                {t(
                  'Rapid Sprint requires at least 10 published questions. Keep learning!',
                  'Tantangan Cepat membutuhkan setidaknya 10 soal yang dipublikasikan. Terus belajar!'
                )}
              </p>
            </div>
          )}

          {/* High-Impact CTA Button */}
          <button
            type="button"
            disabled={isLoading || questions.length < 10 || Boolean(error)}
            onClick={() => {
              if (questions.length >= 10 && !isLoading) setIsStarted(true)
            }}
            className={`relative z-10 mt-6 flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border-b-4 px-6 py-4 text-lg font-black transition-all ${
              isLoading || questions.length < 10 || Boolean(error)
                ? 'border-slate-300 bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'border-amber-800 bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 active:translate-y-1 active:border-b-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-200'
            }`}
          >
            <Zap className={`h-5 w-5 fill-current ${isLoading ? 'animate-pulse' : ''}`} />
            {isLoading
              ? t('Preparing Sprint…', 'Menyiapkan Tantangan…')
              : questions.length < 10
                ? t('Not Enough Questions', 'Soal Belum Cukup')
                : t('Start Rapid Sprint', 'Mulai Tantangan Cepat')}
          </button>
        </section>
      )}
    </div>
  )
}