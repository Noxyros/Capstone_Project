'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Sparkles, Zap } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import DailyResetCountdown from '@/src/components/widgets/DailyResetCountdown'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { normalizeAnswerOptionMath, normalizeMarkdownMath } from '@/src/lib/markdownMath'
import QuestionImage from '@/src/components/shared/QuestionImage'
import { playClickSound, playCorrectSound, playFanfareSound, playIncorrectSound } from '@/src/lib/soundEffects'

type DailyChallengeQuestion = {
  id: string
  position: number
  prompt: string
  imageUrl?: string | null
  imageAlt?: string | null
  options: { id: string; text: string }[]
  answered: boolean
  isCorrect?: boolean
  correctOptionId?: string | null
}

type DailyChallenge = {
  id: string
  title: string
  questionCount: number
  questionXp: number
  perfectScoreBonus: number
  xpEarned: number
  completed: boolean
  questions: DailyChallengeQuestion[]
}

type DailyChallengeAnswerResult = {
  isCorrect: boolean
  correctOptionId: string | null
  xpAwarded: number
  xpEarned: number
  completed: boolean
}

function isDailyChallengeAnswerResult(value: unknown): value is DailyChallengeAnswerResult {
  return typeof value === 'object'
    && value !== null
    && 'isCorrect' in value && typeof value.isCorrect === 'boolean'
    && 'correctOptionId' in value
    && (value.correctOptionId === null || typeof value.correctOptionId === 'string')
    && 'xpAwarded' in value && typeof value.xpAwarded === 'number'
    && 'xpEarned' in value && typeof value.xpEarned === 'number'
    && 'completed' in value && typeof value.completed === 'boolean'
}

function isDailyChallengeQuestion(value: unknown): value is DailyChallengeQuestion {
  return typeof value === 'object'
    && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'position' in value && typeof value.position === 'number'
    && 'prompt' in value && typeof value.prompt === 'string'
    && (!('imageUrl' in value) || value.imageUrl === null || typeof value.imageUrl === 'string')
    && (!('imageAlt' in value) || value.imageAlt === null || typeof value.imageAlt === 'string')
    && 'options' in value && Array.isArray(value.options)
    && value.options.length === 4
    && value.options.every((option) =>
      typeof option === 'object'
      && option !== null
      && 'id' in option && typeof option.id === 'string'
      && 'text' in option && typeof option.text === 'string')
    && 'answered' in value && typeof value.answered === 'boolean'
    && (!('isCorrect' in value) || typeof value.isCorrect === 'boolean')
    && (!('correctOptionId' in value)
      || value.correctOptionId === null
      || typeof value.correctOptionId === 'string')
}

function isDailyChallenge(value: unknown): value is DailyChallenge {
  return typeof value === 'object'
    && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'title' in value && typeof value.title === 'string'
    && 'questionCount' in value && value.questionCount === 3
    && 'questionXp' in value && value.questionXp === 25
    && 'perfectScoreBonus' in value && value.perfectScoreBonus === 25
    && 'xpEarned' in value && typeof value.xpEarned === 'number'
    && 'completed' in value && typeof value.completed === 'boolean'
    && 'questions' in value && Array.isArray(value.questions)
    && value.questions.length === 3
    && value.questions.every(isDailyChallengeQuestion)
}

const CHALLENGE_CACHE_PREFIX = 'questly_daily_challenge:v2:'

function getCachedChallenge(userId: string, date: string): DailyChallenge | null {
  if (!userId || typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(`${CHALLENGE_CACHE_PREFIX}${userId}:${date}`)
    if (!cached) return null
    const parsed: unknown = JSON.parse(cached)
    if (
      typeof parsed !== 'object'
      || parsed === null
      || !('date' in parsed)
      || parsed.date !== date
      || !('challenge' in parsed)
      || !isDailyChallenge(parsed.challenge)
    ) return null
    const challenge = {
      ...parsed.challenge,
      questions: parsed.challenge.questions.map((question) => question.answered
        ? question
        : { ...question, correctOptionId: null }),
    }
    cacheChallenge(userId, date, challenge)
    return challenge
  } catch (error) {
    console.warn('Could not restore the daily challenge from this browser tab.', error)
    return null
  }
}

function cacheChallenge(userId: string, date: string, challenge: DailyChallenge): void {
  if (!userId || typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      `${CHALLENGE_CACHE_PREFIX}${userId}:${date}`,
      JSON.stringify({ date, challenge }),
    )
  } catch (error) {
    console.warn('Could not cache the daily challenge for this browser tab.', error)
  }
}

export default function DailyQuizWidget({
  dailyResetDate,
  secondsUntilReset,
}: {
  dailyResetDate: string
  secondsUntilReset: number
}) {
  const { t } = useLanguage()
  const { profile, updateProfile } = useAuth()
  const profileRef = useRef(profile)
  const challengeRef = useRef<DailyChallenge | null>(null)
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const savedAnswerIds = useRef(new Set<string>())
  const answerSaveQueue = useRef<Promise<void>>(Promise.resolve())
  const challengeLoadInFlight = useRef(false)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useLayoutEffect(() => {
    const cached = profile?.id ? getCachedChallenge(profile.id, dailyResetDate) : null
    challengeRef.current = cached
    setChallenge(cached)
    setIsLoading(true)
    setError('')
    setIsSubmittingAnswer(false)
    if (cached) {
      const nextQuestion = cached.questions.findIndex((question) => !question.answered)
      setQuestionIndex(nextQuestion >= 0 ? nextQuestion : cached.questions.length - 1)
      setSelectedOption(null)
      setIsSubmittingAnswer(false)
      savedAnswerIds.current = new Set(
        cached.questions.filter((question) => question.answered).map((question) => question.id),
      )
    } else {
      setQuestionIndex(0)
      setSelectedOption(null)
      setIsSubmittingAnswer(false)
      savedAnswerIds.current.clear()
    }
  }, [dailyResetDate, profile?.id])

  const loadChallenge = useCallback(async () => {
    if (challengeLoadInFlight.current) return false
    challengeLoadInFlight.current = true
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/daily-quiz', { cache: 'no-store' })
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : t('Could not load today’s challenge.', 'Tidak dapat memuat tantangan hari ini.')
        throw new Error(message)
      }
      if (
        typeof result !== 'object'
        || result === null
        || !('challenge' in result)
        || !isDailyChallenge(result.challenge)
      ) {
        throw new Error(t('The server returned invalid daily challenge data.', 'Server mengirim data tantangan harian yang tidak valid.'))
      }
      challengeRef.current = result.challenge
      setChallenge(result.challenge)
      if (profileRef.current?.id) {
        cacheChallenge(profileRef.current.id, dailyResetDate, result.challenge)
      }
      const nextQuestion = result.challenge.questions.findIndex((question) => !question.answered)
      setQuestionIndex(nextQuestion >= 0 ? nextQuestion : result.challenge.questions.length - 1)
      setSelectedOption(null)
      savedAnswerIds.current = new Set(
        result.challenge.questions
          .filter((question) => question.answered)
          .map((question) => question.id),
      )
      return true
    } catch (loadError) {
      console.error('Failed to load the daily challenge.', loadError)
      setError(loadError instanceof Error ? loadError.message : t('Could not load today’s challenge.', 'Tidak dapat memuat tantangan hari ini.'))
      return false
    } finally {
      challengeLoadInFlight.current = false
      setIsLoading(false)
    }
  }, [dailyResetDate, t])

  useEffect(() => {
    void loadChallenge()
  }, [dailyResetDate, loadChallenge, profile?.id])

  const currentQuestion = challenge?.questions[questionIndex]

  const submitAnswer = (optionId: string) => {
    if (!challenge || !currentQuestion || currentQuestion.answered || isSubmittingAnswer || savedAnswerIds.current.has(currentQuestion.id)) return
    savedAnswerIds.current.add(currentQuestion.id)
    setSelectedOption(optionId)
    setIsSubmittingAnswer(true)
    setError('')

    answerSaveQueue.current = answerSaveQueue.current.then(async () => {
      let lastError: Error | null = null
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch('/api/daily-quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: challenge.id, questionId: currentQuestion.id, optionId }),
          })
          const result: unknown = await response.json()
          if (!response.ok) {
            const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
              ? result.error
              : t('Could not save your answer.', 'Jawaban tidak dapat disimpan.')
            throw new Error(message)
          }
          if (!isDailyChallengeAnswerResult(result)) {
            throw new Error(t('The server returned invalid answer data.', 'Server mengirim data jawaban yang tidak valid.'))
          }
          const currentChallenge = challengeRef.current
          if (!currentChallenge) {
            setIsSubmittingAnswer(false)
            return
          }
          const updatedChallenge = {
            ...currentChallenge,
            xpEarned: result.xpEarned,
            completed: result.completed,
            questions: currentChallenge.questions.map((question) => question.id === currentQuestion.id
              ? {
                  ...question,
                  answered: true,
                  isCorrect: result.isCorrect,
                  correctOptionId: result.correctOptionId,
                }
              : question),
          }
          challengeRef.current = updatedChallenge
          setChallenge(updatedChallenge)
          setSelectedOption(optionId)
          setIsSubmittingAnswer(false)
          setError('')
          if (profileRef.current?.id) {
            cacheChallenge(profileRef.current.id, dailyResetDate, updatedChallenge)
          }
          if (result.completed) {
            playFanfareSound()
          } else if (result.isCorrect) {
            playCorrectSound()
          } else {
            playIncorrectSound()
          }
          const latestProfile = profileRef.current
          if (latestProfile && result.xpAwarded > 0) {
            const nextProfile = {
              ...latestProfile,
              totalXp: latestProfile.totalXp + result.xpAwarded,
              weeklyXp: latestProfile.weeklyXp + result.xpAwarded,
            }
            profileRef.current = nextProfile
            updateProfile(nextProfile)
          }
          return
        } catch (saveError) {
          lastError = saveError instanceof Error ? saveError : new Error('Could not save your answer.')
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
        }
      }
      console.error('Failed to save the daily challenge answer after retries.', lastError)
      savedAnswerIds.current.delete(currentQuestion.id)
      setSelectedOption(null)
      setIsSubmittingAnswer(false)
      setIsOpen(false)
      setError(t(
        'Your answer could not be confirmed or saved. Keep this page open and try again.',
        'Jawabanmu belum bisa dipastikan atau disimpan. Biarkan halaman ini terbuka dan coba lagi.',
      ))
    })
  }

  const completed = challenge?.completed ?? false
  const correctCount = challenge?.questions.filter((question) => question.isCorrect).length ?? 0
  const currentIsCorrect = currentQuestion?.isCorrect ?? null
  const canContinue = Boolean(currentQuestion?.answered && questionIndex < (challenge?.questionCount ?? 0) - 1)

  return (
    <div>
      <div className="flex min-w-0 flex-col justify-between gap-4 rounded-3xl border-b-4 border-orange-700 bg-linear-to-r from-amber-400 to-orange-500 p-5 text-white shadow-md sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0 rounded-2xl bg-white/20 p-3 backdrop-blur-md">
            <Zap className="h-8 w-8 animate-bounce fill-yellow-200 text-yellow-100" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-extrabold uppercase text-yellow-100">
                {t('Daily Challenge', 'Tantangan Harian')}
              </span>
              {challenge && !completed && (
                <span className="text-xs font-bold text-yellow-100">{t('Up to 100 XP', 'Hingga 100 XP')}</span>
              )}
            </div>
            <h3 className="text-lg font-extrabold leading-snug tracking-wide">
              {isLoading
                ? t('Loading today’s challenge…', 'Memuat tantangan hari ini…')
                : t('3 questions. One daily challenge.', '3 soal. Satu tantangan harian.')}
            </h3>
            {error && <p role="alert" className="mt-1 max-w-2xl text-sm font-bold text-white">{error}</p>}
          </div>
        </div>

        {completed ? (
          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-black/20 px-4 py-2 text-xs font-bold">
            <DailyResetCountdown secondsRemaining={secondsUntilReset} />
          </div>
        ) : error ? (
          <button
            type="button"
            onClick={() => void loadChallenge()}
            className="w-full shrink-0 self-stretch rounded-2xl bg-white px-5 py-2.5 text-sm font-extrabold text-orange-600 shadow-sm sm:w-auto sm:self-auto"
          >
            {t('Try again', 'Coba lagi')}
          </button>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading || !challenge}
            onClick={async () => {
              playClickSound()
              if (await loadChallenge()) setIsOpen(true)
            }}
            className="daily-quiz-play w-full shrink-0 self-stretch rounded-2xl border-b-2 bg-white px-5 py-2.5 text-sm font-extrabold text-orange-600 shadow-sm disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:self-auto"
          >
            {t('Play Challenge', 'Mainkan Tantangan')}
          </motion.button>
        )}
      </div>

      {isOpen && challenge && currentQuestion && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="daily-challenge-prompt"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border-4 border-slate-100 bg-white text-slate-700 shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-3 pt-4 sm:px-6">
                <span className="flex items-center gap-1 text-sm font-extrabold text-amber-500">
                  <Sparkles className="h-4 w-4" /> {t('Daily Challenge', 'Tantangan Harian')}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound()
                    setIsOpen(false)
                  }}
                  className="text-sm font-bold text-slate-400 hover:text-slate-600"
                >
                  {t('Close', 'Tutup')}
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-500">
                  <span>{t(`Question ${questionIndex + 1} of ${challenge.questionCount}`, `Soal ${questionIndex + 1} dari ${challenge.questionCount}`)}</span>
                  <span>{challenge.xpEarned} / 100 XP</span>
                </div>
                <div className="flex gap-2" aria-label={t('Challenge progress', 'Progres tantangan')}>
                  {challenge.questions.map((question, index) => (
                    <div key={question.id} className={`h-2 flex-1 rounded-full ${
                      index < questionIndex || question.answered ? 'bg-amber-400' : 'bg-slate-200'
                    }`} />
                  ))}
                </div>
              </div>

              <QuestionImage src={currentQuestion.imageUrl} alt={currentQuestion.imageAlt} />
              <div id="daily-challenge-prompt" className="curriculum-markdown curriculum-markdown-compact mb-2 text-xl font-extrabold text-slate-700">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {normalizeMarkdownMath(currentQuestion.prompt)}
                </ReactMarkdown>
              </div>
              <p className="mb-4 text-xs font-semibold text-slate-400">
                {t(`+${challenge.questionXp} XP for each correct answer · +${challenge.perfectScoreBonus} XP for a perfect score`,
                  `+${challenge.questionXp} XP untuk setiap jawaban benar · +${challenge.perfectScoreBonus} XP untuk nilai sempurna`)}
              </p>
              <div className="my-6 space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option.id
                  const isCorrectChoice = currentQuestion.correctOptionId === option.id
                  let optionStyle = 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  if (isCorrectChoice && currentIsCorrect !== null) {
                    optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  } else if (isSelected && currentIsCorrect === false) {
                    optionStyle = 'border-rose-500 bg-rose-50 text-rose-700'
                  } else if (isSelected && isSubmittingAnswer) {
                    optionStyle = 'border-amber-400 bg-amber-50 text-amber-900'
                  }
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={currentQuestion.answered || isSubmittingAnswer}
                      onClick={() => void submitAnswer(option.id)}
                      className={`w-full rounded-2xl border-2 border-b-4 p-4 text-left font-bold transition-all disabled:cursor-default ${optionStyle}`}
                    >
                      <div className="curriculum-markdown curriculum-markdown-compact">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {normalizeAnswerOptionMath(option.text)}
                        </ReactMarkdown>
                      </div>
                    </button>
                  )
                })}
              </div>
              {isSubmittingAnswer && (
                <p role="status" className="mb-4 text-center text-sm font-bold text-amber-700">
                  {t('Checking your answer…', 'Memeriksa jawaban…')}
                </p>
              )}
              </div>

              {currentQuestion.answered && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="shrink-0 border-t border-slate-100 bg-white px-5 pb-5 pt-4 sm:px-6"
                >
                  {completed ? (
                    <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-100 p-4 font-bold text-emerald-800">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      {correctCount === challenge.questionCount
                        ? t(`Perfect! You earned ${challenge.xpEarned} XP.`, `Sempurna! Kamu mendapat ${challenge.xpEarned} XP.`)
                        : t(`Challenge complete! You earned ${challenge.xpEarned} XP.`, `Tantangan selesai! Kamu mendapat ${challenge.xpEarned} XP.`)}
                    </div>
                  ) : (
                    <div className={`mb-4 flex items-center gap-2 rounded-2xl p-4 font-bold ${
                      currentIsCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      {currentIsCorrect
                        ? t(`Correct! +${challenge.questionXp} XP.`, `Benar! +${challenge.questionXp} XP.`)
                        : t('Not quite. The correct answer is highlighted.', 'Belum tepat. Jawaban yang benar ditandai.')}
                    </div>
                  )}
                  {canContinue ? (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setQuestionIndex((index) => index + 1)
                        setSelectedOption(null)
                      }}
                      className="w-full rounded-2xl bg-amber-400 py-3 font-extrabold text-amber-950"
                    >
                      {t('Next question', 'Soal berikutnya')}
                    </button>
                  ) : completed ? (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound()
                        setIsOpen(false)
                      }}
                      className="w-full rounded-2xl bg-slate-800 py-3 font-extrabold text-white"
                    >
                      {t('Done', 'Selesai')}
                    </button>
                  ) : null}
                </motion.div>
              )}
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
