// components/widgets/DailyQuizWidget.tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

interface DailyQuizProps {
  quizId?: string
  title?: string
  prompt?: string
  options?: { id: string; text: string; isCorrect: boolean }[]
  alreadyAttempted?: boolean
  xpReward?: number
}

const defaultOptions = [
  { id: '1', text: 'Option A', isCorrect: false },
  { id: '2', text: 'Option B', isCorrect: true },
  { id: '3', text: 'Option C', isCorrect: false },
]

export default function DailyQuizWidget({
  title,
  prompt,
  options = defaultOptions,
  alreadyAttempted = false,
  xpReward = 50,
}: DailyQuizProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(alreadyAttempted)
  const [isCorrect, setIsCorrect] = useState(false)

  // Default teks terjemahan jika props tidak dikirim dari parent
  const displayTitle = title || t('Are You Smarter Than a 7th Grader?', 'Apakah Kamu Lebih Pintar dari Anak Kelas 7?')
  const displayPrompt = prompt || t('What is the value of x in 2x + 4 = 12?', 'Berapa nilai x dalam 2x + 4 = 12?')

  const handleAnswer = (optionId: string, correct: boolean) => {
    if (isSubmitted) return
    setSelectedOption(optionId)
    setIsCorrect(correct)
    setIsSubmitted(true)
  }

  return (
    <div>
      {/* Dashboard Banner */}
      <div className="bg-linear-to-r from-amber-400 to-orange-500 rounded-3xl p-5 text-white shadow-md border-b-4 border-orange-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-4 min-w-0">
          <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shrink-0">
            <Zap className="w-8 h-8 text-yellow-100 fill-yellow-200 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase bg-white/20 px-2 py-0.5 rounded-full text-yellow-100">
                {t('1-a-day Challenge', 'Tantangan Harian')}
              </span>
              <span className="text-xs font-bold text-yellow-200">+{xpReward} XP</span>
            </div>
            <h3 className="text-lg font-extrabold leading-snug tracking-wide">{displayTitle}</h3>
          </div>
        </div>

        {alreadyAttempted || isSubmitted ? (
          <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-2xl text-xs font-bold shrink-0">
            <Clock className="w-4 h-4 text-amber-200" />
            <span>{t('Completed Today', 'Selesai Hari Ini')}</span>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="daily-quiz-play bg-white text-orange-600 font-extrabold px-5 py-2.5 rounded-2xl shadow-sm text-sm border-b-2 shrink-0 self-start sm:self-auto"
          >
            {t('Play Challenge', 'Mainkan Tantangan')}
          </motion.button>
        )}
      </div>

      {/* Quiz Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-4 border-slate-100 relative text-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-1 font-extrabold text-amber-500 text-sm">
                  <Sparkles className="w-4 h-4" /> {t('Daily Lightning Round', 'Putaran Kilat Harian')}
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 font-bold hover:text-slate-600 text-sm"
                >
                  {t('Close', 'Tutup')}
                </button>
              </div>

              <h2 className="text-xl font-extrabold text-slate-700 mb-2">{displayPrompt}</h2>

              <div className="space-y-3 my-6">
                {options.map((opt) => {
                  let btnStyle = 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                  if (isSubmitted && opt.id === selectedOption) {
                    btnStyle = opt.isCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={isSubmitted}
                      onClick={() => handleAnswer(opt.id, opt.isCorrect)}
                      className={`w-full p-4 text-left border-2 border-b-4 rounded-2xl font-bold transition-all ${btnStyle}`}
                    >
                      {opt.text}
                    </button>
                  )
                })}
              </div>

              {isSubmitted && (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  <div
                    className={`p-4 rounded-2xl mb-4 font-bold flex items-center gap-2 ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isCorrect
                      ? t(`Correct! You earned +${xpReward} XP!`, `Benar! Kamu mendapatkan +${xpReward} XP!`)
                      : t('Not quite! Better luck on tomorrow’s challenge.', 'Kurang tepat! Coba lagi di tantangan besok.')}
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-slate-800 text-white font-extrabold py-3 rounded-2xl"
                  >
                    {t('Done', 'Selesai')}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}