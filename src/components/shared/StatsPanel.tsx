'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Heart, ChevronDown, GraduationCap, Gem } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useUser } from '@/src/context/UserContext'

const GRADES = [7, 8, 9] as const
const MAX_HEARTS = 5

function StreakCalendar({ streak }: { streak: number }) {
  const { t, language } = useLanguage()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthLabel = now.toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })
  const weekdays = language === 'id' ? ['M', 'S', 'S', 'R', 'K', 'J', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const activeDays = new Set<number>()
  for (let i = 0; i < streak; i++) {
    const d = new Date(year, month, today - i)
    if (d.getMonth() === month) activeDays.add(d.getDate())
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="mb-3">
        <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
          {t(`${streak} day streak`, `${streak} hari beruntun`)}
        </p>
        <p className="text-xs font-bold text-slate-400 capitalize">{monthLabel}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekdays.map((d, i) => (
          <span key={i} className="text-[10px] font-extrabold text-slate-400 py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const isToday = day === today
          const isActive = activeDays.has(day)
          return (
            <span
              key={day}
              className={`h-8 rounded-lg text-xs font-extrabold flex items-center justify-center ${isActive
                ? 'bg-orange-500 text-white shadow-sm'
                : isToday
                  ? 'border-2 border-orange-300 text-orange-500'
                  : 'text-slate-400'
                }`}
            >
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function MiniCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-3">{children}</div>
}

export default function StatsPanel() {
  const { t } = useLanguage()
  const { gems, hearts, streak } = useUser()
  const [grade, setGrade] = useState<(typeof GRADES)[number]>(7)
  const [open, setOpen] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const toggle = (id: string) => setOpen((prev) => (prev === id ? null : id))
  const onStatClick = (id: string) => { if (window.innerWidth < 1024) toggle(id) }

  return (
    <div ref={rootRef} className="flex items-center justify-between gap-2 font-extrabold text-sm w-full lg:flex-col lg:items-stretch">
      <div className="relative flex-1 lg:flex-none min-w-0">
        <button
          onClick={() => toggle('course')}
          className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border-2 border-b-4 border-slate-200 hover:border-slate-300 transition-colors w-full"
        >
          <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
          <span className="text-xs uppercase tracking-wide truncate">{t(`Grade ${grade}`, `Kelas ${grade}`)}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 ml-auto shrink-0" />
        </button>

        <AnimatePresence>
          {open === 'course' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 mt-2 w-44 bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-2 z-50"
            >
              <div className="text-[10px] font-extrabold text-slate-400 uppercase px-2 py-1">{t('Grade', 'Kelas')}</div>
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => { setGrade(g); setOpen(null); }}
                  className={`w-full p-2.5 rounded-xl cursor-pointer font-bold text-xs text-left ${grade === g ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {t(`Grade ${g}`, `Kelas ${g}`)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1 shrink-0 lg:justify-between lg:bg-slate-50 lg:p-1.5 lg:rounded-2xl lg:border stats-panel-border">

        {/* Streak Stat */}
        <div className="group/streak relative">
          <button onClick={() => onStatClick('streak')} className="flex items-center gap-1.5 text-orange-500 hover:bg-white lg:hover:shadow-sm px-2 py-1.5 rounded-xl transition-all">
            <Flame className="w-5 h-5 fill-orange-500" />
            <span>{streak}</span>
          </button>
          <div className="hidden lg:group-hover/streak:block absolute top-full right-0 pt-2 w-72 z-50">
            <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-4">
              <StreakCalendar streak={streak} />
            </div>
          </div>
        </div>

        {/* Hearts Stat */}
        <div className="group/hearts relative">
          <button onClick={() => onStatClick('hearts')} className="flex items-center gap-1.5 text-rose-500 hover:bg-white lg:hover:shadow-sm px-2 py-1.5 rounded-xl transition-all">
            <Heart className="w-5 h-5 fill-rose-500" />
            <span>{hearts}</span>
          </button>
          <div className={`absolute top-full right-0 pt-2 w-52 z-50 ${open === 'hearts' ? 'block' : 'hidden lg:group-hover/hearts:block'}`}>
            <MiniCard>
              <p className="font-extrabold text-rose-500 flex items-center gap-1.5">
                <Heart className="w-4 h-4 fill-rose-500" />
                {t(`${hearts} / ${MAX_HEARTS} hearts`, `${hearts} / ${MAX_HEARTS} hati`)}
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {hearts >= MAX_HEARTS ? t('You are fully charged.', 'Energi kamu penuh.') : t('Hearts refill over time.', 'Hati terisi seiring waktu.')}
              </p>
            </MiniCard>
          </div>
        </div>

        {/* Gems Stat */}
        <div className="group/gems relative">
          <button onClick={() => onStatClick('gems')} className="flex items-center gap-1.5 text-sky-500 hover:bg-white lg:hover:shadow-sm px-2 py-1.5 rounded-xl transition-all">
            <Gem className="w-5 h-5 fill-sky-400" />
            <span>{gems}</span>
          </button>
          <div className={`absolute top-full right-0 pt-2 w-52 z-50 ${open === 'gems' ? 'block' : 'hidden lg:group-hover/gems:block'}`}>
            <MiniCard>
              <p className="font-extrabold text-sky-500 flex items-center gap-1.5">
                <Gem className="w-4 h-4 fill-sky-400" />
                {gems} {t('Gems', 'Permata')}
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1">
                {t('Spend Gems on power-ups in the shop.', 'Gunakan Permata untuk membeli power-up di toko.')}
              </p>
            </MiniCard>
          </div>
        </div>

      </div>

      {/* Mobile Streak Modal */}
      <AnimatePresence>
        {open === 'streak' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 z-60 lg:hidden" onClick={() => setOpen(null)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className="fixed inset-x-0 bottom-0 z-70 bg-white rounded-t-3xl border-t-2 border-slate-200 p-5 pb-8 shadow-2xl lg:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />
              <StreakCalendar streak={streak} />
              <button onClick={() => setOpen(null)} className="mt-4 w-full bg-orange-500 text-white font-extrabold py-3 rounded-2xl shadow-sm hover:bg-orange-600 transition-colors">
                {t('Keep it going', 'Pertahankan')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}