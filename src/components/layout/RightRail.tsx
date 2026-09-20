'use client'

import Link from 'next/link'
import { Flame, Trophy, Snowflake, Heart, Gem } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useUser } from '@/src/context/UserContext'

export default function RightRail() {
  const { t } = useLanguage()
  const { gems, hearts, streak, freezesEquipped, buyItem, setHearts } = useUser()

  const handleBuyHearts = () => {
    // Requires 50 gems. Restores hearts to max (5).
    buyItem(50, () => setHearts(5))
  }

  const handleBuyFreeze = () => {
    // Requires 200 gems. Cannot exceed 2 equipped.
    buyItem(200, () => {
       alert("Streak freeze purchased! (Will hook to database update later)")
    })
  }

  return (
    <div className="space-y-4">
      {/* Leaderboard Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-extrabold text-slate-700">{t('Leaderboard', 'Papan Peringkat')}</h3>
          <Link 
            href="/leaderboard" 
            className="text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline transition-colors px-2 py-1 -mr-2"
          >
            {t('View board', 'Lihat papan')}
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed">
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
          <h3 className="font-extrabold text-slate-700">{t('Keep the fire', 'Pertahankan api')}</h3>
        </div>
        <p className="text-sm font-semibold text-slate-500 leading-relaxed mb-3">
          {t(
            `You’re on a ${streak}-day streak. One short lesson today protects it.`,
            `Kamu berada dalam ${streak} hari beruntun. Satu pelajaran singkat hari ini melindunginya.`
          )}
        </p>
        
        {/* Dynamic Streak Freeze message */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Snowflake className={`w-4 h-4 ${freezesEquipped > 0 ? 'text-sky-400 fill-sky-400/20' : 'text-slate-300'}`} />
          {freezesEquipped > 0 
            ? t('Streak Freeze active', 'Pembeku Streak aktif')
            : t('No Streak Freeze active', 'Tidak ada Pembeku aktif')
          }
        </div>
      </div>

      {/* Power-ups Store */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4">
        <h3 className="font-extrabold text-slate-700 mb-3">{t('Power-ups', 'Power-up')}</h3>
        <div className="space-y-2">
          
          {/* Interactive Heart Refill */}
          <button 
            onClick={handleBuyHearts}
            disabled={gems < 50 || hearts >= 5}
            className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 border-2 border-transparent hover:border-slate-200 hover:bg-slate-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-slate-50"
          >
            <span className="flex items-center gap-3 text-sm font-bold text-slate-600 group-hover:text-slate-800">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" /> 
              {hearts >= 5 ? t('Hearts Full', 'Hati Penuh') : t('Heart refill', 'Isi ulang hati')}
            </span>
            <span className="flex items-center gap-1 text-sm font-black text-sky-500">
              50 <Gem className="w-4 h-4 fill-sky-400 text-sky-500" />
            </span>
          </button>

          {/* Interactive Streak Freeze */}
          <button 
            onClick={handleBuyFreeze}
            disabled={gems < 200 || freezesEquipped >= 2}
            className="w-full flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 border-2 border-transparent hover:border-slate-200 hover:bg-slate-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent disabled:hover:bg-slate-50"
          >
            <div className="flex flex-col items-start">
              <span className="flex items-center gap-3 text-sm font-bold text-slate-600 group-hover:text-slate-800">
                <Snowflake className="w-5 h-5 fill-sky-400 text-sky-500" /> 
                {t('Streak Freeze', 'Pembeku Streak')}
              </span>
              <span className={`text-[10px] font-extrabold ml-8 uppercase tracking-wider ${freezesEquipped >= 2 ? 'text-amber-500' : 'text-slate-400'}`}>
                {freezesEquipped}/2 {t('Equipped', 'Terpakai')}
              </span>
            </div>
            <span className="flex items-center gap-1 text-sm font-black text-sky-500">
              200 <Gem className="w-4 h-4 fill-sky-400 text-sky-500" />
            </span>
          </button>

        </div>
        <p className="text-xs font-semibold text-slate-400 mt-4 leading-relaxed">
          {t(
            'Power-ups cost Gems. Earn Gems by completing lessons and quests!',
            'Power-up menggunakan Permata. Dapatkan Permata dengan menyelesaikan pelajaran!'
          )}
        </p>
      </div>
    </div>
  )
}