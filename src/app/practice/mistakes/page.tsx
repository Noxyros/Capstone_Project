'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Trophy, X, XCircle } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { playCorrectSound, playIncorrectSound, playFanfareSound, playClickSound } from '@/src/lib/soundEffects'
import { LearningTutor } from '@/src/components/shared/LearningTutor'
import QuestionImage from '@/src/components/shared/QuestionImage'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { normalizeAnswerOptionMath, normalizeMarkdownMath } from '@/src/lib/markdownMath'
import {
  getCachedMistakes,
  loadMistakes,
  subscribeToPracticeChanges,
  type Mistake,
} from '@/src/lib/practiceClient'

export default function MistakeReviewPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const scope = user?.id ?? 'public'
const [mistakes, setMistakes] = useState<Mistake[]>(() => getCachedMistakes(scope) ?? [])
const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [correctOptionIds, setCorrectOptionIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    getCachedMistakes(scope) === null ? 'loading' : 'loaded',
  )
  const [isChecking, setIsChecking] = useState(false)
const [error, setError] = useState('')
  const [resolvedCount, setResolvedCount] = useState(0)

  const loadMistakesData = useCallback(async (force = false) => {
    setStatus('loading')
    setError('')
    try {
      const result = await loadMistakes(scope, { force })
      setMistakes(result)
      setQuestionIndex(0)
      setSelectedOptionIds([])
      setFeedback(null)
      setResolvedCount(0)
      setStatus('loaded')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('Could not load missed questions.', 'Tidak dapat memuat soal yang terlewat.'))
      setStatus('error')
    }
  }, [scope, t])

  useEffect(() => {
    const cached = getCachedMistakes(scope)
    setMistakes(cached ?? [])
    setStatus(cached === null ? 'loading' : 'loaded')
    setError('')

    void loadMistakesData()

    const unsubscribe = subscribeToPracticeChanges(() => {
      void loadMistakesData()
    })

    return () => unsubscribe()
  }, [scope, loadMistakesData])

  const current = mistakes[questionIndex]

  const toggleOption = (optionId: string) => {
    if (!current || feedback === 'correct' || isChecking) return
    playClickSound()
    setFeedback(null)
    setSelectedOptionIds((selected) => {
      if (!current.allowsMultipleAnswers) return [optionId]
      return selected.includes(optionId)
        ? selected.filter((id) => id !== optionId)
        : [...selected, optionId]
    })
  }

  const checkAnswer = async () => {
    if (!current || selectedOptionIds.length === 0 || isChecking) return
    setIsChecking(true)
    setError('')
    try {
      const response = await fetch('/api/practice/mistakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: current.questionId, optionIds: selectedOptionIds }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(
        typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : t('Could not check your answer.', 'Tidak dapat memeriksa jawabanmu.')
      )
      if (
        typeof result !== 'object'
        || result === null
        || !('isCorrect' in result)
        || typeof result.isCorrect !== 'boolean'
        || !('correctOptionIds' in result)
        || !Array.isArray(result.correctOptionIds)
        || !result.correctOptionIds.every((id) => typeof id === 'string')
      ) {
        throw new Error(t('The server returned invalid answer data.', 'Server mengirim data jawaban yang tidak valid.'))
      }
      if (result.isCorrect) {
        setCorrectOptionIds(result.correctOptionIds)
        playCorrectSound()
        setFeedback('correct')
      } else {
        playIncorrectSound()
        setFeedback('incorrect')
      }
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : t('Could not check your answer.', 'Tidak dapat memeriksa jawabanmu.'))
    } finally {
      setIsChecking(false)
    }
  }

  const continueReview = () => {
    if (feedback === 'correct') {
      setResolvedCount((count) => count + 1)
      const nextMistakes = mistakes.filter((_, idx) => idx !== questionIndex)
      if (nextMistakes.length === 0) {
        playFanfareSound()
      }
      setMistakes(nextMistakes)
    } else {
      setQuestionIndex((index) => index + 1)
    }
    setSelectedOptionIds([])
    setCorrectOptionIds([])
    setFeedback(null)
    setError('')
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (e.key === 'Enter') {
        e.preventDefault()
        if (feedback === 'correct') {
          continueReview()
        } else if (selectedOptionIds.length > 0 && !isChecking) {
          void checkAnswer()
        }
        return
      }

      if (feedback !== 'correct' && current) {
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
  }, [feedback, selectedOptionIds, isChecking, current, continueReview, checkAnswer, toggleOption])

  const textOf = (ids: string[]) =>
    ids
      .map((id) => current?.options.find((o: { id: string; text: string }) => o.id === id)?.text)
      .filter((text): text is string => Boolean(text))

  const isCorrect = feedback === 'correct'

  const tutorContext = current
    ? {
        kind: 'quiz' as const,
        title: current.nodeTitle,
        question: current.prompt,
        choices: current.options.map((o: { id: string; text: string }) => o.text),
        answerStatus: 'checked' as const,
        selectedAnswers: textOf(selectedOptionIds),
        correctAnswers: textOf(correctOptionIds),
      }
    : null

  const autoPrompt = isCorrect
    ? t(
        'Explain why my answer is correct and briefly why the other options are wrong.',
        'Jelaskan mengapa jawabanku benar dan singkat mengapa pilihan lain salah.'
      )
    : t(
        "My answer was wrong. Explain why my selected answer is incorrect and show me the right answer with full working.",
        'Jawabanku salah. Jelaskan mengapa jawabanku salah dan tunjukkan jawaban yang benar dengan perhitungan lengkap.'
      )

  // Progress: solved questions are removed from `mistakes`, so total = remaining + solved.
  const totalCount = mistakes.length + resolvedCount
  const progressPct = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0

  const barTone =
    feedback === 'correct'
      ? 'border-emerald-300 bg-emerald-50'
      : feedback === 'incorrect'
        ? 'border-rose-300 bg-rose-50'
        : 'border-slate-200 bg-white'

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 sm:px-0">
      {/* Shake animation for a wrong option (disabled when the user prefers reduced motion). */}
      <style>{`@keyframes mr-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>

      {/* Compact header: back + icon + title on one row */}
      <header>
        <div className="flex items-center gap-3">
          <Link
            href="/practice"
            aria-label={t('Back to Practice', 'Kembali ke Latihan')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-800 sm:text-4xl">
              {t('Mistake Review', 'Perbaikan Kesalahan')}
            </h1>
            <p className="text-xs font-bold text-slate-500 sm:text-sm">
              {t('Retry the questions you missed.', 'Ulangi soal yang pernah salah.')}
            </p>
          </div>
        </div>
        <p className="mt-3 inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 sm:text-xs">
          {t('Practice only · no hearts or XP', 'Latihan saja · tanpa hati atau XP')}
        </p>
      </header>

      {status === 'loading' ? (
        <p className="rounded-2xl border-2 border-slate-200 bg-white p-5 font-semibold text-slate-500" role="status">
          {t('Loading your missed questions...', 'Memuat soal yang terlewat...')}
        </p>
      ) : status === 'error' ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-bold text-rose-700">{error}</p>
          <button type="button" onClick={() => void loadMistakesData()} className="mt-4 min-h-11 rounded-xl border-2 border-rose-300 bg-white px-4 font-extrabold text-rose-700 hover:bg-rose-100">
            {t('Try again', 'Coba lagi')}
          </button>
        </div>
      ) : !current ? (
        <div
          className="rounded-3xl border-2 border-b-4 border-emerald-200 bg-white px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12"
          role="status"
        >
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border-2 border-emerald-200 bg-emerald-100 text-emerald-600 shadow-inner">
            {resolvedCount > 0 ? (
              <Trophy className="h-10 w-10" strokeWidth={2.25} />
            ) : (
              <CheckCircle2 className="h-10 w-10" strokeWidth={2.25} />
            )}
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-800">
            {resolvedCount > 0
              ? t('Review complete!', 'Latihan selesai!')
              : t('No missed questions yet', 'Belum ada soal yang terlewat')}
          </h2>

          {resolvedCount > 0 && (
            <p className="mt-3 inline-block rounded-lg bg-emerald-50 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-600">
              {t(`${resolvedCount} solved`, `${resolvedCount} soal selesai`)}
            </p>
          )}

          <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
            {resolvedCount > 0
              ? t(
                'Great job clearing your review queue.',
                'Bagus sekali, antrean latihanmu sekarang bersih.'
              )
              : t(
                'Questions you answer incorrectly in a quiz will appear here.',
                'Soal yang kamu jawab salah dalam kuis akan muncul di sini.',
              )}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/practice/bank"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 font-extrabold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              {t('Try the Question Bank', 'Coba Bank Soal')}
            </Link>
            <Link
              href="/practice"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 font-extrabold text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
            >
              {t('Back to Practice', 'Kembali ke Latihan')}
            </Link>
          </div>
        </div>
      ) : (
        <div>
          {/* Progress */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-slate-500">
              <span>{t(`${resolvedCount} of ${totalCount} solved`, `${resolvedCount} dari ${totalCount} selesai`)}</span>
              <span>{progressPct}%</span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPct}
            >
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <article className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-wide text-rose-600">
              {current.submoduleTitle
                ? `${current.chapterTitle} · ${current.submoduleTitle}`
                : current.chapterTitle}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-400">{current.nodeTitle}</p>
            <QuestionImage src={current.imageUrl} alt={current.imageAlt} />
            <div
              role="heading"
              aria-level={2}
              className="mt-4 text-xl font-extrabold leading-relaxed text-slate-800 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden"
            >
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {normalizeMarkdownMath(current.prompt)}
              </ReactMarkdown>
            </div>
            {current.allowsMultipleAnswers && (
              <p className="mt-2 inline-block rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-600">
                {t('Select all correct answers.', 'Pilih semua jawaban yang benar.')}
              </p>
            )}

            <div className="mt-5 space-y-3">
              {current.options.map((option: { id: string; text: string }, index: number) => {
                const selected = selectedOptionIds.includes(option.id)
                const isRight = feedback === 'correct' && correctOptionIds.includes(option.id)
                const isWrong = feedback === 'incorrect' && selected
                const dimmed = feedback === 'correct' && !isRight

                const state = isRight
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                  : isWrong
                    ? 'border-rose-400 bg-rose-50 text-rose-800 [animation:mr-shake_0.35s_ease-in-out] motion-reduce:[animation:none]'
                    : selected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50'

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={feedback === 'correct' || isChecking}
                    aria-pressed={selected}
                    onClick={() => toggleOption(option.id)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-b-4 p-4 text-left font-bold transition-all active:translate-y-1 active:border-b-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-default ${state} ${dimmed ? 'opacity-60' : ''}`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 text-base ${
                        isRight
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : isWrong
                            ? 'border-rose-500 bg-rose-500 text-white'
                              : 'border-current/20'
                      }`}
                    >
                      {isRight ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : isWrong ? (
                        <X className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1 break-words [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {normalizeAnswerOptionMath(option.text)}
                      </ReactMarkdown>
                    </div>
                  </button>
                )
              })}
            </div>

            {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

            <div className="mt-5 border-t-2 border-slate-100 pt-4">
              <Link
                href={`/chapter/${encodeURIComponent(current.chapterId)}/node/${encodeURIComponent(current.nodeId)}`}
                className="inline-flex items-center gap-1.5 rounded-lg text-sm font-extrabold text-slate-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
              >
                {t('Open full lesson', 'Buka pelajaran lengkap')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          {/* Sticky action bar: stays above the mobile bottom nav (adjust bottom-[72px] to your nav height) */}
          <div
            className={`sticky bottom-[72px] z-30 mt-4 rounded-2xl border-2 p-3 shadow-lg transition-colors lg:bottom-4 ${barTone}`}
          >
            {feedback && (
              <p
                role="status"
                className={`mb-3 flex items-center gap-2 text-sm font-extrabold ${feedback === 'correct' ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {feedback === 'correct' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0" />
                )}
                {feedback === 'correct'
                  ? t('Correct! You fixed that mistake.', 'Benar! Kamu berhasil memperbaiki kesalahan itu.')
                  : t('Not quite—change your selection and try again.', 'Belum tepat—ubah pilihanmu dan coba lagi.')}
              </p>
            )}

            <div className="flex gap-2">
              {feedback === 'correct' ? (
                <button
                  type="button"
                  onClick={continueReview}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-5 py-3 font-extrabold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                  {questionIndex === mistakes.length - 1 ? t('Finish review', 'Selesaikan latihan') : t('Next question', 'Soal berikutnya')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void checkAnswer()}
                  disabled={selectedOptionIds.length === 0 || isChecking}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-3 font-extrabold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isChecking ? t('Checking...', 'Memeriksa...') : t('Check answer', 'Periksa jawaban')}
                </button>
              )}
            </div>
          </div>

          {feedback !== null && current && tutorContext && (
            <div className="mt-4">
              <LearningTutor
                key={`${current.questionId}-${feedback}`}
                context={tutorContext}
                autoPrompt={autoPrompt}
                autoPromptOnOpen
              />
            </div>
          )}
        </div>
      )
    }
    </div>
  )
}
