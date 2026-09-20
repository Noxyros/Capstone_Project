'use client'

import React from 'react'
import Link from 'next/link'
import { Dumbbell, RotateCcw, Zap, Target } from 'lucide-react'
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
      badge: '7 Available',
      color: 'bg-rose-100 border-rose-200 text-rose-600', // Deepened text color for better contrast
    },
    {
      id: 'speed',
      titleEn: 'Rapid Sprint',
      titleId: 'Tantangan Cepat',
      descEn: 'Answer 10 fast questions under time pressure for extra XP.',
      descId: 'Jawab 10 soal cepat untuk mendapatkan bonus XP.',
      icon: Zap,
      badge: '+30 XP',
      color: 'bg-amber-100 border-amber-200 text-amber-600',
    },
    {
      id: 'weakness',
      titleEn: 'Weak Skills',
      titleId: 'Keahlian Lemah',
      descEn: 'Target modules where your score dropped below 80%.',
      descId: 'Fokus pada modul dengan skor di bawah 80%.',
      icon: Target,
      badge: '2 Topics',
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
            'Mistakes from lessons land here. Practice to strengthen your skills and regain hearts.',
            'Soal yang salah akan masuk ke sini. Latihlah untuk menguatkan pemahaman dan memulihkan nyawa.'
          )}
        </p>
      </div>

      <div className="space-y-4">
        {practiceModes.map((mode) => {
          const Icon = mode.icon
          return (
            <div
              key={mode.id}
              // 2. Align items to the top on mobile so the icon doesn't float weirdly if text wraps
              className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex items-start sm:items-center gap-4 hover:bg-slate-50 active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer select-none"
            >
              <div className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center shrink-0 shadow-inner ${mode.color}`}>
                <Icon className="w-7 h-7" strokeWidth={2.5} />
              </div>
              
              <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                {/* 3. Stack title and badge nicely on very small screens */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 sm:mb-1 gap-2 sm:gap-0">
                  <h2 className="text-lg font-extrabold text-slate-700">{t(mode.titleEn, mode.titleId)}</h2>
                  <span className="text-xs font-extrabold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wide inline-block w-fit">
                    {mode.badge}
                  </span>
                </div>
                
                {/* 4. Removed 'truncate' so the description fully displays on mobile */}
                <p className="text-sm font-semibold text-slate-500 mt-1 sm:mt-0 leading-snug">
                  {t(mode.descEn, mode.descId)}
                </p>
              </div>
            </div>
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