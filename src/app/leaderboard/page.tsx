'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { getCachedLeaderboard, loadLeaderboard, type LeaderboardData } from '@/src/lib/leaderboardClient'

function LeaderboardAvatar({ name, src, highlighted }: { name: string; src: string | null; highlighted: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-xs font-extrabold sm:h-10 sm:w-10 sm:text-sm ${
      highlighted
        ? 'border-indigo-200 bg-indigo-100 text-indigo-600'
        : 'border-slate-200 bg-slate-100 text-slate-500'
    }`}>
      {src && !imageFailed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const authUserId = user?.id ?? ''
  const [data, setData] = useState<LeaderboardData | null>(() => authUserId ? getCachedLeaderboard(authUserId) : null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(() => !authUserId || !getCachedLeaderboard(authUserId))

  useEffect(() => {
    if (!authUserId) {
      setData(null)
      setLoading(true)
      return
    }
    let active = true
    const cached = getCachedLeaderboard(authUserId)
    setData(cached)
    setLoading(!cached)
    setError('')
    void loadLeaderboard(authUserId)
      .then((result) => { if (active) setData(result) })
      .catch((loadError: unknown) => {
        if (active && !cached) {
          setError(loadError instanceof Error
            ? loadError.message
            : t('Could not load the leaderboard.', 'Tidak dapat memuat papan peringkat.'))
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [authUserId, t])

  const retry = () => {
    if (!authUserId) return
    setLoading(true)
    setError('')
    void loadLeaderboard(authUserId)
      .then(setData)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error
          ? loadError.message
          : t('Could not load the leaderboard.', 'Tidak dapat memuat papan peringkat.'))
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4 sm:px-0">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-amber-100 rounded-2xl shadow-sm border-2 border-amber-200 text-amber-600 shrink-0">
            <Trophy className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
            {t('Leaderboard', 'Papan Peringkat')}
          </h1>
        </div>
        <p className="text-sm font-semibold text-slate-500">{t('Weekly XP', 'XP Mingguan')}</p>
      </div>

      <div className="bg-white border-2 border-b-4 sm:border-b-[6px] border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden">
        {loading ? (
          <p role="status" className="p-8 text-center font-bold text-slate-500">{t('Loading leaderboard…', 'Memuat papan peringkat…')}</p>
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="font-bold text-rose-700">{error}</p>
            <button type="button" onClick={retry} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 font-extrabold text-white">
              {t('Try again', 'Coba lagi')}
            </button>
          </div>
        ) : !data?.rows.length ? (
          <p className="p-8 text-center font-bold text-slate-500">{t('No learners yet. Complete a lesson to get started!', 'Belum ada pelajar. Selesaikan pelajaran untuk memulai!')}</p>
        ) : (
          data.rows.map((row) => {
            const isCurrentUser = row.id === data.currentUserId
            const displayName = row.handle ?? row.name ?? t('Learner', 'Pelajar')
            return (
              <div
                key={row.id}
                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-8 py-3.5 sm:py-4 border-b-2 border-slate-100 last:border-b-0 ${
                  isCurrentUser ? 'bg-indigo-50/50' : 'hover:bg-slate-50 transition-colors'
                }`}
              >
                <span className={`font-extrabold text-base sm:text-lg w-8 text-center shrink-0 ${row.rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                  {row.rank}
                </span>
                <LeaderboardAvatar key={`${row.id}:${row.avatarUrl ?? ''}`} name={displayName} src={row.avatarUrl} highlighted={isCurrentUser} />
                <span className={`flex-1 min-w-0 font-extrabold text-base sm:text-lg truncate ${isCurrentUser ? 'text-indigo-600' : 'text-slate-700'}`}>
                  {isCurrentUser ? `${t('You', 'Kamu')} · ${displayName}` : displayName}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-400 bg-slate-100 px-2.5 sm:px-3 py-1 rounded-xl shrink-0">
                  {row.weeklyXp} XP
                </span>
              </div>
            )
          })
        )}
      </div>

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
