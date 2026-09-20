'use client'

import React from 'react'
import { useLanguage } from '@/src/context/LanguageContext'
import { LifeBuoy, Heart, Flame } from 'lucide-react'

export default function HelpPage() {
  const { t } = useLanguage()

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-700 flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-sky-500" />
          {t('Help & Guide', 'Bantuan & Panduan')}
        </h1>
        <p className="text-base font-semibold text-slate-500 mt-2">
          {t('Everything you need to know about playing.', 'Semua yang perlu kamu ketahui tentang cara bermain.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Help Card 1 */}
        <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-700">
              {t('What are hearts?', 'Apa itu nyawa?')}
            </h2>
          </div>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed pl-13">
            {t(
              'Hearts are tries. Miss a question and you lose one. They refill over time, or you can spend XP to refill them instantly.',
              'Nyawa adalah kesempatan mencoba. Jika salah menjawab, nyawa berkurang. Nyawa akan terisi seiring waktu atau dapat dibeli dengan XP.'
            )}
          </p>
        </div>

        {/* Help Card 2 */}
        <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-700">
              {t('How do I keep a streak?', 'Bagaimana cara menjaga streak?')}
            </h2>
          </div>
          <p className="text-sm font-semibold text-slate-500 leading-relaxed pl-13">
            {t(
              'Finish at least one lesson each day to keep your fire alive. You can equip a Streak Freeze to cover one missed day without losing your progress.',
              'Selesaikan minimal satu pelajaran setiap hari. Kamu bisa melengkapi Pembeku Streak untuk melindungi jika terlewat satu hari.'
            )}
          </p>
        </div>

      </div>
    </div>
  )
}