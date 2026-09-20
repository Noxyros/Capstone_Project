'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export default function LeaderboardPage() {
  const { t } = useLanguage()

  const [rows] = useState([
    { place: 1, name: 'Ava', xp: 820, you: false },
    { place: 2, name: 'You', xp: 450, you: true },
    { place: 3, name: 'Kenji', xp: 410, you: false },
    { place: 4, name: 'Mia', xp: 360, you: false },
  ])

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4 sm:px-0">
      
      {/* 1. Header perfectly matched to PracticePage */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-amber-100 rounded-2xl shadow-sm border-2 border-amber-200 text-amber-600 shrink-0">
            <Trophy className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            {t('Leaderboard', 'Papan Peringkat')}
          </h1>
        </div>
        <p className="text-sm sm:text-base font-semibold text-slate-500 leading-relaxed max-w-xl">
          {t('Weekly XP. Compete, then reset on Monday.', 'XP Mingguan. Bersaing, lalu reset pada hari Senin.')}
        </p>
      </div>

      {/* 2. Leaderboard Cards Container */}
      <div className="bg-white border-2 border-b-4 sm:border-b-[6px] border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.place}
            className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-8 py-3.5 sm:py-4 border-b-2 border-slate-100 last:border-b-0 ${
              row.you ? 'bg-indigo-50/50' : 'hover:bg-slate-50 transition-colors'
            }`}
          >
            {/* Rank Position */}
            <span className={`font-extrabold text-base sm:text-lg w-5 sm:w-6 text-center shrink-0 ${row.place <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
              {row.place}
            </span>

            {/* Avatar Circle */}
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-extrabold text-xs sm:text-sm border-2 shrink-0 ${
              row.you
                ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {row.name.charAt(0)}
            </div>

            {/* Username */}
            <span className={`flex-1 min-w-0 font-extrabold text-base sm:text-lg truncate ${row.you ? 'text-indigo-600' : 'text-slate-700'}`}>
              {row.you ? t('You', 'Kamu') : row.name}
            </span>

            {/* XP Badge */}
            <span className="text-xs sm:text-sm font-extrabold text-slate-400 bg-slate-100 px-2.5 sm:px-3 py-1 rounded-xl shrink-0">
              {row.xp} XP
            </span>
          </div>
        ))}
      </div>

      {/* 3. Responsive CTA Button */}
      <div className="pt-2 sm:pt-4 text-center">
        <Link
          href="/"
          className="w-full sm:w-auto inline-block px-5 sm:px-6 py-3 font-extrabold rounded-2xl border-2 border-b-4 hover:bg-indigo-200 active:border-b-2 active:translate-y-[2px] transition-all uppercase tracking-wide text-xs sm:text-sm leaderboard-climb"
        >
          {t('Complete a lesson to climb', 'Selesaikan pelajaran untuk naik rank')}
        </Link>
      </div>
    </div>
  )
}