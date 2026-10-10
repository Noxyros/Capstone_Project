'use client'

import { useLanguage } from '@/src/context/LanguageContext'
import type { DailyQuest } from '@/src/lib/dailyQuests'

interface DailyQuestCardProps {
  quest: DailyQuest
  current: number
  rewarded: boolean
}

export default function DailyQuestCard({
  quest,
  current,
  rewarded,
}: DailyQuestCardProps) {
  const { t } = useLanguage()
  const completed = current >= quest.target
  const progress = Math.min(100, Math.round((current / quest.target) * 100))
  const done = completed && rewarded

  return (
    <article className={`rounded-2xl border-2 p-4 shadow-sm ${
      done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-extrabold ${done ? 'text-emerald-700' : 'text-slate-700'}`}>
            {t(quest.title.en, quest.title.id)}
          </h3>
          <p className={`text-xs font-semibold ${done ? 'text-emerald-600/80' : 'text-slate-500'}`}>
            {t(quest.description.en, quest.description.id)}
          </p>
        </div>
        <span className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-extrabold ${
          done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          +{quest.xpReward} XP
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={t(quest.title.en, quest.title.id)}
          aria-valuemin={0}
          aria-valuemax={quest.target}
          aria-valuenow={Math.min(current, quest.target)}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-all ${done ? 'bg-emerald-400' : 'bg-indigo-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={`text-[11px] font-bold tabular-nums ${done ? 'text-emerald-600' : 'text-slate-500'}`}>
          {Math.min(current, quest.target)}/{quest.target}
        </span>
      </div>
    </article>
  )
}
