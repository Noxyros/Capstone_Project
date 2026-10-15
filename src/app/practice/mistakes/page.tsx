'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

type MistakeOption = { id: string; text: string }
type Mistake = {
  questionId: string
  prompt: string
  options: MistakeOption[]
  allowsMultipleAnswers: boolean
  chapterId: string
  chapterTitle: string
  nodeId: string
  nodeTitle: string
  submoduleTitle: string | null
}
type MistakesResponse = { mistakes: Mistake[] }

function isMistakesResponse(value: unknown): value is MistakesResponse {
  return typeof value === 'object'
    && value !== null
    && 'mistakes' in value
    && Array.isArray(value.mistakes)
    && value.mistakes.every((mistake) =>
      typeof mistake === 'object'
      && mistake !== null
      && 'questionId' in mistake && typeof mistake.questionId === 'string'
      && 'prompt' in mistake && typeof mistake.prompt === 'string'
      && 'options' in mistake && Array.isArray(mistake.options)
      && mistake.options.every((option: unknown) =>
        typeof option === 'object'
        && option !== null
        && 'id' in option && typeof option.id === 'string'
        && 'text' in option && typeof option.text === 'string')
      && 'allowsMultipleAnswers' in mistake && typeof mistake.allowsMultipleAnswers === 'boolean'
      && 'chapterId' in mistake && typeof mistake.chapterId === 'string'
      && 'chapterTitle' in mistake && typeof mistake.chapterTitle === 'string'
      && 'nodeId' in mistake && typeof mistake.nodeId === 'string'
      && 'nodeTitle' in mistake && typeof mistake.nodeTitle === 'string'
      && 'submoduleTitle' in mistake
      && (typeof mistake.submoduleTitle === 'string' || mistake.submoduleTitle === null)
    )
}

export default function MistakeReviewPage() {
  const { t } = useLanguage()
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [resolvedCount, setResolvedCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadMistakes() {
      setStatus('loading')
      setError('')
      try {
        const response = await fetch('/api/practice/mistakes', {
          cache: 'no-store',
          signal: controller.signal,
        })
        const result: unknown = await response.json()
        if (!response.ok) throw new Error(
          typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
            ? result.error
            : t('Could not load missed questions.', 'Tidak dapat memuat soal yang terlewat.')
        )
        if (!isMistakesResponse(result)) throw new Error(t('The server returned invalid practice data.', 'Server mengirim data latihan yang tidak valid.'))
        setMistakes(result.mistakes)
        setQuestionIndex(0)
        setSelectedOptionIds([])
        setFeedback(null)
        setResolvedCount(0)
        setStatus('loaded')
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : t('Could not load missed questions.', 'Tidak dapat memuat soal yang terlewat.'))
          setStatus('error')
        }
      }
    }
    void loadMistakes()
    return () => controller.abort()
  }, [retryCount, t])

  const current = mistakes[questionIndex]

  const toggleOption = (optionId: string) => {
    if (!current || feedback === 'correct' || isChecking) return
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
        setFeedback('correct')
      } else {
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
      setMistakes((prev) => prev.filter((_, idx) => idx !== questionIndex))
    } else {
      setQuestionIndex((index) => index + 1)
    }
    setSelectedOptionIds([])
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

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-10 sm:px-0">
      <div>
        <Link
          href="/practice"
          className="mb-5 inline-flex items-center gap-2 rounded-lg font-extrabold text-slate-500 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('Back to Practice', 'Kembali ke Latihan')}
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-100 p-3 text-rose-600">
            <RotateCcw className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl">
              {t('Mistake Review', 'Perbaikan Kesalahan')}
            </h1>
            {status === 'loaded' && mistakes.length > 0 && current && (
              <p className="mt-1 text-sm font-bold text-slate-500">
                {t(
                  `${mistakes.length} question${mistakes.length > 1 ? 's' : ''} to resolve`,
                  `${mistakes.length} soal untuk diperbaiki`
                )}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
          {t(
            'Retry the specific questions you previously answered incorrectly. Practice answers do not use hearts or award XP.',
            'Ulangi soal-soal yang sebelumnya kamu jawab salah. Latihan ini tidak menggunakan hati atau memberikan XP.'
          )}
        </p>
      </div>

      {status === 'loading' ? (
        <p className="rounded-2xl border-2 border-slate-200 bg-white p-5 font-semibold text-slate-500" role="status">
          {t('Loading your missed questions...', 'Memuat soal yang terlewat...')}
        </p>
      ) : status === 'error' ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-bold text-rose-700">{error}</p>
          <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 min-h-11 rounded-xl border-2 border-rose-300 bg-white px-4 font-extrabold text-rose-700 hover:bg-rose-100">
            {t('Try again', 'Coba lagi')}
          </button>
        </div>
      ) : !current ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6" role="status">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-emerald-800">
              {resolvedCount > 0
                ? t('Review complete!', 'Latihan selesai!')
                : t('No missed questions yet', 'Belum ada soal yang terlewat')}
            </h2>
          </div>
          <p className="mt-2 font-semibold text-emerald-700">
            {resolvedCount > 0
              ? t(
                  `You solved all ${resolvedCount} mistake${resolvedCount > 1 ? 's' : ''}! Great job clearing your review queue.`,
                  `Kamu berhasil menyelesaikan ${resolvedCount} soal yang salah! Bagus sekali, antrean latihanmu sekarang bersih.`
                )
              : t('Questions you answer incorrectly in a quiz will appear here.', 'Soal yang kamu jawab salah dalam kuis akan muncul di sini.')}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Link
              href="/practice"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border-b-4 border-emerald-700 bg-emerald-500 px-5 font-black text-white hover:bg-emerald-600"
            >
              {t('Back to Practice', 'Kembali ke Latihan')}
            </Link>
          </div>
        </div>
      ) : (
        <article className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-wide text-rose-600">
            {current.submoduleTitle
              ? `${current.chapterTitle} · ${current.submoduleTitle}`
              : current.chapterTitle}
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-700">{current.nodeTitle}</h2>
          <p className="mt-5 text-xl font-extrabold leading-relaxed text-slate-800">{current.prompt}</p>
          {current.allowsMultipleAnswers && (
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {t('Select all correct answers.', 'Pilih semua jawaban yang benar.')}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {current.options.map((option, index) => {
              const selected = selectedOptionIds.includes(option.id)
              const disabled = feedback === 'correct' || isChecking
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => toggleOption(option.id)}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 p-4 text-left font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-default ${
                    selected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-current text-sm">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option.text}</span>
                </button>
              )
            })}
          </div>

          {feedback && (
            <p className={`mt-4 rounded-xl p-3 text-sm font-extrabold ${feedback === 'correct' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`} role="status">
              {feedback === 'correct'
                ? t('Correct! You fixed that mistake.', 'Benar! Kamu berhasil memperbaiki kesalahan itu.')
                : t('Not quite—change your selection and try again.', 'Belum tepat—ubah pilihanmu dan coba lagi.')}
            </p>
          )}
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {feedback === 'correct' ? (
              <button type="button" onClick={continueReview} className="min-h-12 flex-1 rounded-2xl border-b-4 border-emerald-800 bg-emerald-600 px-5 py-3 font-extrabold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
                {questionIndex === mistakes.length - 1 ? t('Finish review', 'Selesaikan latihan') : t('Next question', 'Soal berikutnya')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void checkAnswer()}
                disabled={selectedOptionIds.length === 0 || isChecking}
                className="min-h-12 flex-1 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-3 font-extrabold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
              >
                {isChecking ? t('Checking...', 'Memeriksa...') : t('Check answer', 'Periksa jawaban')}
              </button>
            )}
            <Link href={`/chapter/${encodeURIComponent(current.chapterId)}/node/${encodeURIComponent(current.nodeId)}`} className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-slate-200 px-5 py-3 text-center font-extrabold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200">
              {t('Open full lesson', 'Buka pelajaran lengkap')}
            </Link>
          </div>
        </article>
      )}
    </div>
  )
}
