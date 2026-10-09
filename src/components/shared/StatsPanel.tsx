'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Heart, ChevronDown, GraduationCap, Gem, Snowflake, X, Zap, Infinity, Sparkles } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useUser } from '@/src/context/UserContext'

const GRADES = [7, 8, 9] as const
function StreakCalendar({ streak, activityDates }: { streak: number; activityDates: string[] }) {
  const { t, language } = useLanguage()
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const datePart = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value ?? ''
  const todayKey = `${datePart('year')}-${datePart('month')}-${datePart('day')}`
  const year = Number(datePart('year'))
  const month = Number(datePart('month')) - 1
  const today = Number(datePart('day'))
  const calendarWeekday = new Date(year, month, 1).getDay()
  const firstWeekday = language === 'id' ? (calendarWeekday + 6) % 7 : calendarWeekday
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthLabel = new Date(Date.UTC(year, month, 15)).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const weekdays = language === 'id' ? ['S', 'S', 'R', 'K', 'J', 'S', 'M'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const activeDays = new Set(activityDates
    .filter((date) => date.startsWith(todayKey.slice(0, 7)))
    .map((date) => Number(date.slice(-2))))

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      <div className="mb-4">
        <p className="font-extrabold text-slate-800 text-lg flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
          {t(`${streak} day streak`, `${streak} hari beruntun`)}
        </p>
        <p className="text-sm font-bold text-slate-400 capitalize">{monthLabel}</p>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekdays.map((d, i) => (
          <span key={i} className="text-[11px] font-extrabold text-slate-400 py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const isToday = day === today
          const isActive = activeDays.has(day)
          return (
            <span
              key={day}
              className={`h-10 rounded-xl text-sm font-extrabold flex items-center justify-center ${isActive
                ? 'bg-orange-500 text-white shadow-[0_3px_0_0_#ea580c]'
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
  return <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-4">{children}</div>
}

export default function StatsPanel() {
  const { t } = useLanguage()
  const {
    gems,
    hearts,
    maxHearts,
    unlimitedHearts,
    streak,
    activityDates,
    freezesEquipped,
    doubleXpUntil,
    isMutating,
    isSuperModePending,
    gameError,
    buyPowerUp,
    setSuperMode,
    activateHeartSurge,
  } = useUser()
  const [grade, setGrade] = useState<(typeof GRADES)[number]>(7)
  const [open, setOpen] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const xpBoostSecondsLeft = doubleXpUntil ? Math.max(0, Math.ceil((Date.parse(doubleXpUntil) - now) / 1000)) : 0
  const xpBoostActive = xpBoostSecondsLeft > 0
  const gemSurgeActive = xpBoostActive
  const gemSurgeSecondsLeft = xpBoostSecondsLeft

  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (!xpBoostActive) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [xpBoostActive])

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  const toggle = (id: string) => setTimeout(() => setOpen((prev) => (prev === id ? null : id)), 0)
  const onStatClick = (id: string) => { if (window.innerWidth < 1024) toggle(id) }

  const handleBuyHearts = () => void buyPowerUp('HEART_REFILL')
  const handleBuyFreeze = () => void buyPowerUp('STREAK_FREEZE')
  const handleBuyXpBoost = () => void buyPowerUp('DOUBLE_XP')

  const handleToggleUnlimited = () => void setSuperMode(!unlimitedHearts)

  const handleSacrificeSurge = () => void activateHeartSurge()

  const isSurgeDisabled = isMutating || gemSurgeActive || unlimitedHearts || hearts <= 4
  const isHeartRefillDisabled = isMutating || isSuperModePending || unlimitedHearts || gems < 250 || hearts >= maxHearts

  return (
    <div ref={rootRef} className="relative flex items-center justify-between gap-2 font-extrabold w-full lg:flex-col lg:items-stretch">

      {gameError && <p role="alert" className="rounded-xl bg-rose-50 p-2 text-xs font-bold text-rose-700">{gameError}</p>}

      {/* 1. Course Selector Button */}
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
                  className={`w-full p-2.5 rounded-xl cursor-pointer font-bold text-xs text-left ${grade === g ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {t(`Grade ${g}`, `Kelas ${g}`)}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Stats Buttons */}
      <div className="flex items-center gap-1 shrink-0 rounded-2xl bg-slate-50 p-1.5 border stats-panel-border lg:justify-between">

        {/* Streak */}
        <div className="group/streak relative">
          <button
            onClick={() => onStatClick('streak')}
            className="flex items-center gap-1.5 text-orange-500 lg:hover:bg-white lg:hover:shadow-sm active:bg-orange-50 active:scale-95 px-2.5 py-1.5 rounded-xl transition-all"
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-orange-500" />
            <span className="text-sm sm:text-base">{streak}</span>
          </button>
          <div className="hidden lg:group-hover/streak:block absolute top-full right-0 pt-2 w-72 z-50">
            <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-5">
              <StreakCalendar streak={streak} activityDates={activityDates} />
            </div>
          </div>
        </div>

        {/* Hearts Dropdown (Desktop Only) */}
        <div className="group/hearts relative">
          <button
            onClick={() => onStatClick('hearts')}
            className="flex items-center gap-1.5 text-rose-500 lg:hover:bg-white lg:hover:shadow-sm active:bg-rose-50 active:scale-95 px-2.5 py-1.5 rounded-xl transition-all"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-rose-500" />
            <span className="text-sm sm:text-base">{unlimitedHearts ? '∞' : hearts}</span>
          </button>
          <div className="hidden lg:group-hover/hearts:block absolute top-full right-0 pt-2 w-80 z-50">
            <MiniCard>
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b-2 border-slate-100">
                  <p className="font-extrabold text-rose-500 text-base flex items-center gap-1.5">
                    <Heart className="w-5 h-5 fill-rose-500" />
                    {unlimitedHearts ? t('Unlimited Hearts', 'Hati Tak Terbatas') : t(`${hearts} / ${maxHearts} hearts`, `${hearts} / ${maxHearts} hati`)}
                  </p>
                </div>

                {/* Super Mode Card */}
                <div className="bg-white border-2 border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Infinity className="w-5 h-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-black text-slate-700 uppercase tracking-wide">
                          {t('Super Mode', 'Mode Super')}
                        </div>
                        <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                          {t('Never run out of hearts', 'Hati tidak akan pernah habis')}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleUnlimited}
                      disabled={isSuperModePending}
                      role="switch"
                      aria-checked={unlimitedHearts}
                      aria-label={t('Super Mode', 'Mode Super')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-100 ${unlimitedHearts ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-100 ${unlimitedHearts ? 'translate-x-6' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                {/* Gems Surge Card */}
                <div className="bg-white border-2 border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black uppercase tracking-wide text-slate-700">
                          {t('Double XP', 'Double XP')}
                        </div>
                        <div className="text-[11px] font-bold mt-0.5 text-slate-400">
                          {gemSurgeActive
                            ? `${formatTimer(gemSurgeSecondsLeft)} ${t('remaining', 'tersisa')}`
                            : t('Sacrifice 4 hearts', 'Korbankan 4 hati')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSacrificeSurge}
                      disabled={isSurgeDisabled}
                      className="bg-indigo-200 text-indigo-600 hover:bg-indigo-300 disabled:opacity-40 disabled:hover:bg-indigo-200 font-extrabold text-xs px-4 py-2 rounded-xl transition-all shrink-0"
                    >
                      {gemSurgeActive && unlimitedHearts
                        ? t('Disabled', 'Nonaktif')
                        : gemSurgeActive
                          ? t('Active', 'Aktif')
                          : t('Risk It', 'Korbankan')}
                    </button>
                  </div>
                </div>
              </div>
            </MiniCard>
          </div>
        </div>

        {/* Gems Tooltip (Desktop Only) */}
        <div className="group/gems relative">
          <button
            onClick={() => onStatClick('gems')}
            className="flex items-center gap-1.5 text-sky-500 lg:hover:bg-white lg:hover:shadow-sm active:bg-sky-50 active:scale-95 px-2.5 py-1.5 rounded-xl transition-all"
          >
            <Gem className="w-5 h-5 sm:w-6 sm:h-6 fill-sky-400" />
            <span className="text-sm sm:text-base">{gems}</span>
          </button>
          <div className="hidden lg:group-hover/gems:block absolute top-full right-0 pt-2 w-56 z-50">
            <MiniCard>
              <p className="font-extrabold text-sky-500 text-base flex items-center gap-1.5">
                <Gem className="w-5 h-5 fill-sky-400" />
                {gems} {t('Gems', 'Permata')}
              </p>
              <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
                {t('Spend Gems on power-ups in the shop.', 'Gunakan Permata untuk membeli power-up di toko.')}
              </p>
            </MiniCard>
          </div>
        </div>
      </div>

      {/* 3. MOBILE DROPDOWNS */}
      <AnimatePresence>
        {open && open !== 'course' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-[calc(100%+12px)] -left-4 w-screen h-[100dvh] bg-slate-900/40 z-40 lg:hidden"
              onClick={() => setOpen(null)}
            />

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="absolute top-[calc(100%+12px)] -left-4 w-screen bg-white border-b-2 border-slate-200 z-50 lg:hidden shadow-2xl rounded-b-3xl max-h-[85vh] overflow-y-auto"
            >
              {/* --- Streak Dropdown Mobile --- */}
              {open === 'streak' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <Flame className="w-7 h-7 text-orange-500 fill-orange-500" />
                      {t('Streak', 'Beruntun')}
                    </h2>
                    <button onClick={() => setOpen(null)} className="p-2 -mr-2 text-slate-400 active:bg-slate-100 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <StreakCalendar streak={streak} activityDates={activityDates} />
                  <button
                    onClick={() => setOpen(null)}
                    className="mt-6 w-full bg-orange-500 text-white font-extrabold py-3.5 rounded-2xl shadow-[0_4px_0_0_#ea580c] active:translate-y-[4px] active:shadow-none hover:bg-orange-400 transition-all uppercase tracking-wide"
                  >
                    {t('Keep it going', 'Pertahankan')}
                  </button>
                </div>
              )}

              {/* --- Hearts Dropdown Mobile --- */}
              {open === 'hearts' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
                      {unlimitedHearts ? t('Unlimited', 'Tak Terbatas') : t('Hearts', 'Hati')}
                    </h2>
                    <button onClick={() => setOpen(null)} className="p-2 -mr-2 text-slate-400 active:bg-slate-100 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Unlimited Hearts Toggle Mobile */}
                    <div className="rounded-2xl bg-white p-4 border-2 border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Infinity className="w-6 h-6 text-purple-600 shrink-0" />
                        <div className="text-left">
                          <div className="font-extrabold text-slate-800 text-base uppercase tracking-wide">
                            {t('Super Mode', 'Mode Super')}
                          </div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">
                            {t('Never run out of hearts', 'Hati tidak akan pernah habis')}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleUnlimited}
                        disabled={isSuperModePending}
                        role="switch"
                        aria-checked={unlimitedHearts}
                        aria-label={t('Super Mode', 'Mode Super')}
                        className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-100 ${unlimitedHearts ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                      >
                        <div
                          className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-100 ${unlimitedHearts ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Gems Surge Challenge Mobile */}
                    <div className="rounded-2xl bg-white p-4 border-2 border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-indigo-500 shrink-0" />
                        <div className="text-left">
                          <div className="font-extrabold text-slate-800 text-base uppercase tracking-wide">
                            {t('Double XP', 'Double XP')}
                          </div>
                          <div className="text-xs font-bold mt-0.5 text-slate-500">
                            {gemSurgeActive
                              ? `${formatTimer(gemSurgeSecondsLeft)} ${t('remaining', 'tersisa')}`
                              : t('Sacrifice 4 hearts', 'Korbankan 4 hati')}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleSacrificeSurge}
                        disabled={isSurgeDisabled}
                        className="bg-indigo-200 text-indigo-600 hover:bg-indigo-300 disabled:opacity-40 disabled:hover:bg-indigo-200 font-extrabold text-sm px-5 py-2.5 rounded-xl transition-all"
                      >
                        {gemSurgeActive && unlimitedHearts
                          ? t('Disabled', 'Nonaktif')
                          : gemSurgeActive
                            ? t('Active', 'Aktif')
                            : t('Risk It', 'Risiko')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Gems Dropdown Mobile --- */}
              {open === 'gems' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <Gem className="w-7 h-7 text-sky-500 fill-sky-400" />
                      {t('Power-ups', 'Power-up')}
                    </h2>
                    <button onClick={() => setOpen(null)} className="p-2 -mr-2 text-slate-400 active:bg-slate-100 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleBuyHearts}
                      disabled={isHeartRefillDisabled}
                      className="w-full flex items-center justify-between rounded-2xl bg-white p-4 border-2 border-slate-200 active:border-slate-300 transition-all group disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-rose-50 border-2 border-rose-100 flex items-center justify-center shrink-0">
                          <Heart className="w-7 h-7 fill-rose-500 text-rose-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-slate-700 text-lg">
                            {hearts >= maxHearts ? t('Hearts Full', 'Hati Penuh') : t('Heart refill', 'Isi ulang hati')}
                          </div>
                          <div className="text-xs font-bold text-slate-400 mt-0.5">
                            {t('Restore full health', 'Pulihkan kesehatan')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-black text-sky-500 bg-sky-50 px-3.5 py-2 rounded-xl">
                        250 <Gem className="w-4 h-4 fill-sky-400 text-sky-500" />
                      </div>
                    </button>

                    <button
                      onClick={handleBuyXpBoost}
                      disabled={isMutating || gems < 100 || xpBoostActive}
                      className="w-full flex items-center justify-between rounded-2xl bg-white p-4 border-2 border-slate-200 active:border-slate-300 transition-all group disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border-2 border-amber-100 flex items-center justify-center shrink-0">
                          <Zap className="w-7 h-7 fill-amber-400 text-amber-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-slate-700 text-lg">
                            {t('2x XP Boost', '2x XP Boost')}
                          </div>
                          <div className="text-xs font-bold text-slate-400 mt-0.5">
                            {xpBoostActive ? `${formatTimer(xpBoostSecondsLeft)} ${t('remaining', 'tersisa')}` : t('15 mins double XP', '15 menit double XP')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-black text-sky-500 bg-sky-50 px-3.5 py-2 rounded-xl">
                        {xpBoostActive ? t('Active', 'Aktif') : <>100 <Gem className="w-4 h-4 fill-sky-400 text-sky-500" /></>}
                      </div>
                    </button>

                    <button
                      onClick={handleBuyFreeze}
                      disabled={isMutating || gems < 200 || freezesEquipped >= 2}
                      className="w-full flex items-center justify-between rounded-2xl bg-white p-4 border-2 border-slate-200 active:border-slate-300 transition-all group disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-sky-50 border-2 border-sky-100 flex items-center justify-center shrink-0">
                          <Snowflake className="w-7 h-7 fill-sky-400 text-sky-500" />
                        </div>
                        <div className="text-left">
                          <div className="font-extrabold text-slate-700 text-lg">
                            {t('Streak Freeze', 'Pembeku Streak')}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-widest">
                            {freezesEquipped}/2 {t('Equipped', 'Terpakai')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-black text-sky-500 bg-sky-50 px-3.5 py-2 rounded-xl">
                        200 <Gem className="w-4 h-4 fill-sky-400 text-sky-500" />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}