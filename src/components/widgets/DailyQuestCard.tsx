'use client'

interface DailyQuestCardProps {
  title: string
  description: string
  xpReward: number
  current: number
  target: number
}

export default function DailyQuestCard({
  title,
  description,
  xpReward,
  current,
  target,
}: DailyQuestCardProps) {
  const completed = current >= target
  const progress = Math.min(100, Math.round((current / target) * 100))

  return (
    <div
      className={`rounded-2xl p-4 shadow-sm border-2 ${
        completed ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className={`font-extrabold ${completed ? 'text-emerald-700' : 'text-slate-700'}`}>
            {title}
          </h4>
          <p className={`text-xs font-semibold ${completed ? 'text-emerald-600/80' : 'text-slate-400'}`}>
            {description}
          </p>
        </div>

        <div
          className={`text-xs font-extrabold px-2.5 py-1 rounded-xl shrink-0 ${
            completed
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          {completed ? 'Done' : `+${xpReward} XP`}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full ${completed ? 'bg-emerald-400' : 'bg-indigo-400'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          className={`text-[11px] font-bold tabular-nums ${
            completed ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          {Math.min(current, target)}/{target}
        </span>
      </div>
    </div>
  )
}
