'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react' // Try replacing with: Crown, Award, or ListOrdered
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
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-700 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500" />
            {t('Leaderboard', 'Papan Peringkat')}
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-2">
            {t('Weekly XP. Compete, then reset on Monday.', 'XP Mingguan. Bersaing, lalu reset pada hari Senin.')}
          </p>
        </div>
      </div>

      <div className="bg-white border-2 border-b-[6px] border-slate-200 rounded-3xl overflow-hidden">
        {rows.map((row) => (
          <div
            key={row.place}
            className={`flex items-center gap-4 px-5 sm:px-8 py-4 border-b-2 border-slate-100 last:border-b-0 ${row.you ? 'bg-indigo-50/50' : 'hover:bg-slate-50 transition-colors'
              }`}
          >
            <span className={`font-extrabold text-lg w-6 text-center ${row.place <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
              {row.place}
            </span>

            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm border-2 shrink-0 ${row.you
                ? 'bg-indigo-100 border-indigo-200 text-indigo-600'
                : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
              {row.name.charAt(0)}
            </div>

            <span className={`flex-1 font-extrabold text-lg ${row.you ? 'text-indigo-600' : 'text-slate-700'}`}>
              {row.you ? t('You', 'Kamu') : row.name}
            </span>

            <span className="text-sm font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-xl">
              {row.xp} XP
            </span>
          </div>
        ))}
      </div>

      <div className="pt-4 text-center">
        <Link
          href="/"
          className="inline-block px-6 py-3 font-extrabold rounded-2xl border-2 border-b-4 hover:bg-indigo-200 active:border-b-2 active:translate-y-[2px] transition-all uppercase tracking-wide text-sm leaderboard-climb"
        >
          {t('Complete a lesson to climb', 'Selesaikan pelajaran untuk naik rank')}
        </Link>
      </div>
    </div>
  )
}