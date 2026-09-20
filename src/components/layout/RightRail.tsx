'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Flame, Trophy, Snowflake, Heart, Gem, Zap } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useUser } from '@/src/context/UserContext'

export default function RightRail() {
  const { t } = useLanguage()
  const { gems, hearts, streak, freezesEquipped, buyItem, setHearts } = useUser()

  const [xpBoostActive, setXpBoostActive] = useState(false)
  const [xpBoostSecondsLeft, setXpBoostSecondsLeft] = useState(15 * 60)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (xpBoostActive && xpBoostSecondsLeft > 0) {
      interval = setInterval(() => setXpBoostSecondsLeft((prev) => prev - 1), 1000)
    } else if (xpBoostSecondsLeft === 0) {
      setXpBoostActive(false)
    }
    return () => clearInterval(interval)
  }, [xpBoostActive, xpBoostSecondsLeft])

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Heart refill is now 250
  const handleBuyHearts = () => buyItem(250, () => setHearts(5)) 
  const handleBuyFreeze = () => buyItem(200, () => alert('Streak freeze purchased!'))
  const handleBuyXpBoost = () => buyItem(100, () => {
    setXpBoostActive(true)
    setXpBoostSecondsLeft(15 * 60)
  })

  return (
    <div className="space-y-4">
      {/* Leaderboard Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide">{t('Leaderboard', 'Papan Peringkat')}</h3>
          <Link
            href="/leaderboard"
            className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline transition-colors px-1 py-0.5"
          >
            {t('View board', 'Lihat papan')}
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xs font-semibold text-slate-500 leading-relaxed">
            {t(
              'Finish one lesson to join this week’s board and see classmates.',
              'Selesaikan satu pelajaran untuk bergabung di papan minggu ini dan melihat teman sekelas.'
            )}
          </p>
        </div>
      </div>

      {/* Streak Status Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide">{t('Keep the fire', 'Pertahankan api')}</h3>
        </div>
        <p className="text-xs font-semibold text-slate-500 leading-relaxed mb-3">
          {t(
            `You’re on a ${streak}-day streak. One short lesson today protects it.`,
            `Kamu berada dalam ${streak} hari beruntun. Satu pelajaran singkat hari ini melindunginya.`
          )}
        </p>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Snowflake className={`w-4 h-4 ${freezesEquipped > 0 ? 'text-sky-400 fill-sky-400/20' : 'text-slate-300'}`} />
          {freezesEquipped > 0 ? t('Streak Freeze active', 'Pembeku Streak aktif') : t('No Streak Freeze active', 'Tidak ada Pembeku aktif')}
        </div>
      </div>

      {/* Power-ups Store */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
        <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide mb-3">{t('Power-ups', 'Power-up')}</h3>
        <div className="space-y-2">
          
          {/* Heart Refill (250 Gems) */}
          <button
            onClick={handleBuyHearts}
            disabled={gems < 250 || hearts >= 5}
            className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border-2 border-transparent hover:border-slate-200 transition-all group disabled:opacity-50 disabled:hover:border-transparent disabled:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2.5 text-xs font-black text-slate-700">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              {hearts >= 5 ? t('Hearts Full', 'Hati Penuh') : t('Heart refill', 'Isi ulang hati')}
            </span>
            <span className="flex items-center gap-1 text-xs font-black text-sky-500">
              250 <Gem className="w-3.5 h-3.5 fill-sky-400" />
            </span>
          </button>

          {/* 2x XP Boost (100 Gems) */}
          <button
            onClick={handleBuyXpBoost}
            disabled={gems < 100 || xpBoostActive}
            className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border-2 border-transparent hover:border-slate-200 transition-all group disabled:opacity-50 disabled:hover:border-transparent disabled:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Zap className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
              <div>
                <span className="block text-xs font-black text-slate-700">{t('2x XP Boost', '2x XP Boost')}</span>
                {xpBoostActive && <span className="text-[10px] font-bold text-amber-600">{formatTimer(xpBoostSecondsLeft)}</span>}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-black text-sky-500">
              {xpBoostActive ? t('Active', 'Aktif') : <>100 <Gem className="w-3.5 h-3.5 fill-sky-400" /></>}
            </span>
          </button>

          {/* Streak Freeze (200 Gems) */}
          <button
            onClick={handleBuyFreeze}
            disabled={gems < 200 || freezesEquipped >= 2}
            className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border-2 border-transparent hover:border-slate-200 transition-all group disabled:opacity-50 disabled:hover:border-transparent disabled:bg-slate-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-start">
              <span className="flex items-center gap-2.5 text-xs font-black text-slate-700">
                <Snowflake className="w-4 h-4 fill-sky-400 text-sky-500" />
                {t('Streak Freeze', 'Pembeku Streak')}
              </span>
              <span className={`text-[10px] font-black ml-6 uppercase tracking-wider ${freezesEquipped >= 2 ? 'text-amber-500' : 'text-slate-400'}`}>
                {freezesEquipped}/2 {t('Equipped', 'Terpakai')}
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs font-black text-sky-500">
              200 <Gem className="w-3.5 h-3.5 fill-sky-400" />
            </span>
          </button>

        </div>
      </div>
    </div>
  )
}