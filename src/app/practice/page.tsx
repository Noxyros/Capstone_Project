'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dumbbell, RotateCcw, Zap, Target } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { getCachedWeakSkills, loadWeakSkills } from '@/src/lib/practiceClient'

export default function PracticePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [weakSkillCount, setWeakSkillCount] = useState<number | null>(() =>
    user?.id ? getCachedWeakSkills(user.id)?.areas.length ?? null : null)
  const [weakSkillCountError, setWeakSkillCountError] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    async function loadWeakSkillCount() {
      try {
        const result = await loadWeakSkills(userId)
        setWeakSkillCount(result.areas.length)
        setWeakSkillCountError(false)
      } catch {
        setWeakSkillCountError(true)
      }
    }

    void loadWeakSkillCount()
  }, [user?.id])

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
      color: 'bg-rose-100 border-rose-200 text-rose-600', // Deepened text color for better contrast
    },
    {
      id: 'speed',
      titleEn: 'Rapid Sprint',
      titleId: 'Tantangan Cepat',
      descEn: 'Answer 10 fast questions under time pressure for extra XP.',
      descId: 'Jawab 10 soal cepat untuk mendapatkan bonus XP.',
      icon: Zap,
      badgeEn: '+30 XP / day',
      badgeId: '+30 XP / hari',
      href: '/practice/sprint',
      color: 'bg-amber-100 border-amber-200 text-amber-600',
    },
    {
      id: 'weakness',
      titleEn: 'Weak Skills',
      titleId: 'Keahlian Lemah',
      descEn: 'Revisit quiz topics where your best completed score is below 80%.',
      descId: 'Ulangi topik kuis dengan nilai terbaik di bawah 80%.',
      icon: Target,
      badgeEn: 'Areas',
      badgeId: 'Area',
      href: '/practice/weak-skills',
      color: 'bg-indigo-100 border-indigo-200 text-indigo-600',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4 sm:px-0">
      
      {/* 1. Improved Header Alignment & Icon Container */}
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
            'Ulangi soal yang terlewat, pelajari kembali topik, atau coba tantangan dengan waktu.'
          )}
        </p>
      </div>

      <div className="space-y-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon
          const card = (
            <div
              className={`bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4 transition-all select-none ${
                mode.id === 'weakness'
                  ? 'hover:bg-slate-50 active:border-b-2 active:translate-y-[2px]'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-inner ${mode.color}`}>
                <Icon className="w-7 h-7" strokeWidth={2.5} />
              </div>

              <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 sm:mb-1 gap-2 sm:gap-0">
                  <h2 className="text-lg font-extrabold text-slate-700">{t(mode.titleEn, mode.titleId)}</h2>
                  {mode.id === 'weakness' ? (
                    <span className="text-xs font-extrabold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wide inline-block w-fit">
                      {weakSkillCountError
                        ? t('Unavailable', 'Tidak tersedia')
                        : weakSkillCount === null
                          ? t('Checking...', 'Memeriksa...')
                          : t(
                              `${weakSkillCount} ${weakSkillCount === 1 ? 'Area' : mode.badgeEn}`,
                              `${weakSkillCount} ${mode.badgeId}`
                            )}
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wide inline-block w-fit">
                      {t(mode.badgeEn, mode.badgeId)}
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-slate-500 mt-1 sm:mt-0 leading-snug">
                  {t(mode.descEn, mode.descId)}
                </p>
              </div>
            </div>
          )

          return (
            <Link
              key={mode.id}
              href={mode.href}
              className={`block rounded-2xl focus-visible:outline-none focus-visible:ring-4 ${
                mode.id === 'mistakes'
                  ? 'focus-visible:ring-rose-300'
                  : mode.id === 'speed'
                    ? 'focus-visible:ring-amber-300'
                    : 'focus-visible:ring-indigo-300'
              }`}
              aria-label={t(`Open ${mode.titleEn}`, `Buka ${mode.titleId}`)}
            >
              {card}
            </Link>
          )
        })}
      </div>

      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-extrabold text-slate-400 uppercase tracking-widest text-sm hover:text-indigo-500 transition-colors"
        >
          <span>←</span> {t('Go to Learn', 'Kembali ke Belajar')}
        </Link>
      </div>
    </div>
  )
} 