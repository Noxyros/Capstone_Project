'use client'

import React from 'react'
import Link from 'next/link'
import { Dumbbell, RotateCcw, BookOpen } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export default function PracticePage() {
  const { t } = useLanguage()

  const practiceModes = [
    {
      id: 'mistakes',
      titleEn: 'Mistake Review',
      titleId: 'Perbaikan Kesalahan',
      descEn: 'Revisit recent questions you got wrong in your lessons.',
      descId: 'Latih kembali soal-soal yang salah pada pelajaran terakhir.',
      icon: RotateCcw,
      badgeEn: 'Question review',
      badgeId: 'Ulas soal',
      href: '/practice/mistakes',
      color: 'bg-rose-100 border-rose-200 text-rose-600',
    },
    {
      id: 'bank',
      titleEn: 'Question Bank',
      titleId: 'Bank Soal',
      descEn: 'Challenge-based question bank with timer, XP, and gems.',
      descId: 'Bank soal berbasis tantangan dengan timer, XP, dan gems.',
      icon: BookOpen,
      badgeEn: 'Challenges',
      badgeId: 'Tantangan',
      href: '/practice/bank',
      color: 'bg-emerald-100 border-emerald-200 text-emerald-600',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-emerald-100 rounded-2xl shadow-sm border-2 border-emerald-200 text-emerald-600 shrink-0">
            <Dumbbell className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            {t('Practice', 'Latihan')}
          </h1>
        </div>
        <p className="text-sm sm:text-base font-semibold text-slate-500 leading-relaxed max-w-xl">
          {t(
            'Review questions you missed, revisit topics to strengthen, or try a quick timed challenge.',
            'Ulangi soal yang terlewat, pelajari kembali topik, atau coba tantangan dengan waktu.',
          )}
        </p>
      </div>

      <div className="space-y-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon

          return (
            <Link
              key={mode.id}
              href={mode.href}
              className={`block rounded-2xl focus-visible:outline-none focus-visible:ring-4 ${
                mode.id === 'mistakes' ? 'focus-visible:ring-rose-300' : 'focus-visible:ring-emerald-300'
              }`}
              aria-label={t(`Open ${mode.titleEn}`, `Buka ${mode.titleId}`)}
            >
              <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4 transition-all select-none hover:bg-slate-50">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-inner ${mode.color}`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* flex-col-reverse: badge sits ABOVE the title on mobile; desktop stays a row */}
                  <div className="flex flex-col-reverse items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <h2 className="text-lg font-extrabold text-slate-700">{t(mode.titleEn, mode.titleId)}</h2>
                    <span className="inline-block w-fit rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-500 sm:px-2.5 sm:py-1 sm:text-xs">
                      {t(mode.badgeEn, mode.badgeId)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-semibold leading-snug text-slate-500">
                    {t(mode.descEn, mode.descId)}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="pt-2 sm:pt-4 text-center">
        <Link
          href="/"
          className="w-full sm:w-auto inline-block px-5 sm:px-6 py-3 font-extrabold rounded-2xl border-2 border-b-4 hover:bg-indigo-200 active:border-b-2 active:translate-y-[2px] transition-all uppercase tracking-wide text-xs sm:text-sm leaderboard-climb"
        >
          {t('Go to Learn', 'Kembali ke Belajar')}
        </Link>
      </div>
    </div>
  )
}