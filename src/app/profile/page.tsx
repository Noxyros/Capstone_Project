'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Flame, TrendingUp, Zap, Trophy, Medal, User, Sparkles,
  Pencil, AtSign, Upload, CheckCircle2, AlertCircle,
  Settings, BookOpen, Gem, ChevronDown
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { isProfileIdentityPatch } from '@/src/lib/appProfile'
import { PRESET_AVATARS } from '@/src/lib/profileAvatars'

export default function ProfilePage() {
  const { t } = useLanguage()
  const { profile, state: authState, error: authError, updateProfile } = useAuth()

  const [name, setName] = useState(() => profile?.name ?? '')
  const [handle, setHandle] = useState(() => profile?.handle ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => profile?.avatarUrl ?? null)

  const [isUploading, setIsUploading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const [showAllAchievements, setShowAllAchievements] = useState(false)

  useEffect(() => {
    setPortalReady(true)
  }, [])

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setHandle(profile.handle ?? '')
    setAvatarUrl(profile.avatarUrl)
  }, [profile?.id])

  useEffect(() => {
    if (!avatarModalOpen) return
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [avatarModalOpen])

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 3500)
  }

  const getInitials = (value: string) => value.trim().substring(0, 2).toUpperCase() || '??'
  const displayName = name || handle || profile?.email.split('@')[0] || ''
  const joinedDate = profile
    ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(profile.createdAt))
    : ''

  const hasChanges = Boolean(profile && (
    name !== (profile.name ?? '')
    || handle !== (profile.handle ?? '')
    || avatarUrl !== profile.avatarUrl
  ))

  const handleSaveChanges = async () => {
    if (!profile) return
    const previousProfile = profile
    updateProfile({
      ...previousProfile,
      name: name.trim(),
      handle: handle.trim().toLowerCase(),
      avatarUrl,
    }, { invalidateLeaderboard: false })
    setIsSaving(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, handle, avatarUrl }),
      })
      const result: unknown = await response.json()
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : t('Could not save your profile.', 'Tidak dapat menyimpan profil.')
        throw new Error(message)
      }
      if (!isProfileIdentityPatch(result)) {
        throw new Error(t('The server returned invalid profile data.', 'Server mengirim data profil yang tidak valid.'))
      }
      updateProfile({ ...previousProfile, ...result })
      setName(result.name)
      setHandle(result.handle ?? '')
      setAvatarUrl(result.avatarUrl)
      showToast(t('Profile updated successfully!', 'Profil berhasil diperbarui!'), 'success')
    } catch (error) {
      updateProfile(previousProfile, { invalidateLeaderboard: false })
      showToast(error instanceof Error ? error.message : t('Could not save your profile.', 'Tidak dapat menyimpan profil.'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setLoadingText(t('Scanning & Uploading...', 'Memindai & Mengunggah...'))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('handle', handle)

      const res = await fetch('/api/moderate', { method: 'POST', body: formData })

      let data: any = {}
      try {
        data = await res.json()
      } catch (parseError) {
        showToast(t('Error connecting to server. Please try again.', 'Gagal terhubung ke server. Coba lagi.'), 'error')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (!res.ok || !data.allowed) {
        showToast(
          t('Image flagged as inappropriate. Please choose another.', 'Gambar ditandai tidak pantas. Silakan pilih gambar lain.'),
          'warning'
        )
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setAvatarUrl(data.url)
      setAvatarModalOpen(false)
      showToast(t('Avatar selected. Save to apply.', 'Avatar dipilih. Simpan untuk menerapkan.'), 'success')

    } catch (error) {
      showToast(t('Error connecting to server. Please try again.', 'Gagal terhubung ke server. Coba lagi.'), 'error')
    } finally {
      setIsUploading(false)
      setLoadingText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10 relative">

      {/* Mobile Top Header (Hidden on Desktop) */}
      <div className="flex items-center justify-center md:hidden px-1 mb-2">
        <h1 className="text-xl font-extrabold text-slate-700">{t('Profile', 'Profil')}</h1>
      </div>

      <section className="bg-white border-2 border-b-[6px] border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative transition-transform">
        <Link href="/settings" className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-slate-600 transition-colors p-1 z-10">
          <Settings className="w-6 h-6" />
        </Link>

        <div className="shrink-0 relative group cursor-pointer" onClick={() => setAvatarModalOpen(true)}>
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-20 transform translate-y-2"></div>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[6px] border-white shadow-[0_0_0_2px_theme(colors.slate.100)] bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl font-black overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt={t('Profile avatar', 'Avatar profil')} className="w-full h-full object-cover" /> : getInitials(displayName)}
          </div>
          <div className="absolute bottom-0 right-0 bg-slate-800 text-white p-2.5 rounded-full border-2 border-white group-hover:bg-indigo-600 shadow-md transition-colors z-10">
            <Pencil className="w-4 h-4" />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSaveChanges()
          }}
          className="flex-1 space-y-4 w-full"
        >
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {t('Display Name', 'Nama Tampilan')}
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                required
                maxLength={80}
                disabled={!profile}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('Your name', 'Namamu')}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {t('Username', 'Nama Pengguna')}
            </label>
            <div className="relative">
              <AtSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={handle}
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]{3,24}"
                disabled={!profile}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-all lowercase"
              />
            </div>
          </div>

          {authState === 'profile_error' && authError && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
              {authError}
            </p>
          )}

          <div className="pt-2 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4">
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border-2 border-indigo-100 px-4 py-2 rounded-xl uppercase tracking-wider inline-block">
              {profile ? t(`Joined ${joinedDate}`, `Bergabung ${joinedDate}`) : t('Loading profile…', 'Memuat profil…')}
            </span>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all w-full sm:w-auto ${hasChanges && !isSaving ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isSaving ? t('Saving...', 'Menyimpan...') : t('Save Changes', 'Simpan Perubahan')}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-slate-700 mb-5 flex items-center gap-2.5 px-1">
          <User className="w-6 h-6 text-slate-400" /> {t('Statistics', 'Statistik')}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="flex flex-row items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:p-5 shadow-sm">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-orange-400 to-orange-500 border-b-[3px] border-orange-600 shadow-md shadow-orange-500/25">
              <Flame className="h-5 w-5 sm:h-6 sm:w-6 fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold leading-none text-slate-700 sm:text-2xl">{profile?.streak ?? '—'}</h3>
              <p className="mt-1 uppercase tracking-wide text-[10px] font-bold text-slate-400 sm:mt-1.5 sm:text-xs">{t('Day streak', 'Hari streak')}</p>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:p-5 shadow-sm">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-sky-400 to-sky-500 border-b-[3px] border-sky-600 shadow-md shadow-sky-500/25">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold leading-none text-slate-700 sm:text-2xl">{profile?.totalXp ?? '—'}</h3>
              <p className="mt-1 uppercase tracking-wide text-[10px] font-bold text-slate-400 sm:mt-1.5 sm:text-xs">{t('Total XP', 'Total XP')}</p>
            </div>
          </div>

          <Link href="/leaderboard" className="flex flex-row items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:p-5 shadow-sm">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 border-b-[3px] border-amber-600 shadow-md shadow-amber-500/25">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-xl font-extrabold leading-none text-slate-700 sm:text-2xl">
                {profile ? `#${profile.rank}` : '—'}
              </h3>
              <p className="mt-1 truncate uppercase tracking-wide text-[10px] font-bold text-slate-400 sm:mt-1.5 sm:text-xs">{t('Current rank', 'Peringkat saat ini')}</p>
            </div>
          </Link>

          <div className="flex flex-row items-center gap-2 rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:p-5 shadow-sm">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-emerald-400 to-emerald-500 border-b-[3px] border-emerald-600 shadow-md shadow-emerald-500/25">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white stroke-[2.5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold leading-none text-slate-700 sm:text-2xl">{profile?.weeklyXp ?? '—'}</h3>
              <p className="mt-1 uppercase tracking-wide text-[10px] font-bold text-slate-400 sm:mt-1.5 sm:text-xs">{t('Weekly XP', 'XP mingguan')}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-slate-700 mb-5 flex items-center gap-2.5 px-1">
          <Medal className="w-6 h-6 text-slate-400" /> {t('Achievements', 'Pencapaian')}
        </h2>

        {(() => {
          const streak = profile?.streak ?? 0
          const perfectQuizzes = profile?.perfectQuizzesCount ?? 0
          const completedNodes = profile?.completedNodesCount ?? 0
          const totalXp = profile?.totalXp ?? 0
          const gemsEarned = profile?.gemsEarned ?? Math.max(0, (profile?.gems ?? 500) - 500)
          const activeDays = profile?.activityDates?.length ?? 0
          const rank = profile?.rank ?? 999

          const achievements = [
            {
              id: 'wildfire',
              title: t('Wildfire', 'Api Liar'),
              desc: t('Reach a 7 day streak', 'Capai streak 7 hari'),
              icon: Flame,
              current: streak,
              max: 7,
              tokenClass: 'bg-gradient-to-b from-orange-400 to-orange-500 border-b-[3px] border-orange-600 shadow-md shadow-orange-500/25',
              iconClass: 'fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-amber-400',
            },
            {
              id: 'flawless',
              title: t('Flawless Victory', 'Kemenangan Sempurna'),
              desc: t('Perfect score on 5 quizzes', 'Skor sempurna di 5 kuis'),
              icon: Sparkles,
              current: perfectQuizzes,
              max: 5,
              tokenClass: 'bg-gradient-to-b from-sky-400 to-sky-500 border-b-[3px] border-sky-600 shadow-md shadow-sky-500/25',
              iconClass: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-sky-400',
            },
            {
              id: 'scholar',
              title: t('Scholar', 'Cendekiawan'),
              desc: t('Complete 10 lesson steps', 'Selesaikan 10 langkah materi'),
              icon: BookOpen,
              current: completedNodes,
              max: 10,
              tokenClass: 'bg-gradient-to-b from-emerald-400 to-emerald-500 border-b-[3px] border-emerald-600 shadow-md shadow-emerald-500/25',
              iconClass: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-emerald-400',
            },
            {
              id: 'contender',
              title: t('Top Contender', 'Penantang Teratas'),
              desc: t('Reach Rank #1 on the leaderboard', 'Raih Peringkat #1 di papan peringkat'),
              icon: Trophy,
              current: rank === 1 ? 1 : 0,
              max: 1,
              tokenClass: 'bg-gradient-to-b from-amber-400 to-amber-500 border-b-[3px] border-amber-600 shadow-md shadow-amber-500/25',
              iconClass: 'fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-amber-400',
            },
            {
              id: 'xp_titan',
              title: t('XP Titan', 'Titan XP'),
              desc: t('Earn 500 total XP', 'Dapatkan total 500 XP'),
              icon: Zap,
              current: totalXp,
              max: 500,
              tokenClass: 'bg-gradient-to-b from-indigo-400 to-indigo-500 border-b-[3px] border-indigo-600 shadow-md shadow-indigo-500/25',
              iconClass: 'fill-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-indigo-500',
            },
            {
              id: 'gem_hoarder',
              title: t('Gem Hoarder', 'Penimbun Permata'),
              desc: t('Collect 300 gems', 'Kumpulkan 300 permata'),
              icon: Gem,
              current: gemsEarned,
              max: 300,
              tokenClass: 'bg-gradient-to-b from-teal-400 to-teal-500 border-b-[3px] border-teal-600 shadow-md shadow-teal-500/25',
              iconClass: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-teal-400',
            },
            {
              id: 'habit_builder',
              title: t('Habit Builder', 'Pembangun Kebiasaan'),
              desc: t('Study on 7 different days', 'Belajar di 7 hari berbeda'),
              icon: Medal,
              current: activeDays,
              max: 7,
              tokenClass: 'bg-gradient-to-b from-purple-400 to-purple-500 border-b-[3px] border-purple-600 shadow-md shadow-purple-500/25',
              iconClass: 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
              barColor: 'bg-purple-400',
            },
          ]

          const visibleAchievements = showAllAchievements ? achievements : achievements.slice(0, 3)

          return (
            <div className="space-y-4">
              {visibleAchievements.map((item) => {
                const IconComponent = item.icon
                const isLocked = item.current === 0
                const progressPercent = Math.min(100, Math.round((Math.max(0, item.current) / item.max) * 100))

                return (
                  <div
                    key={item.id}
                    className={`border-2 border-b-4 border-slate-200 rounded-2xl p-5 flex items-center gap-5 transition-all ${
                      isLocked
                        ? 'bg-slate-50 opacity-80 grayscale-[0.25]'
                        : 'bg-white'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 transition-transform ${
                        isLocked
                          ? 'bg-slate-200 border-b-[3px] border-slate-300 dark:bg-slate-800 dark:border-slate-900'
                          : item.tokenClass
                      }`}
                    >
                      <IconComponent
                        className={`w-7 h-7 sm:w-8 sm:h-8 ${
                          isLocked ? 'text-slate-400 dark:text-slate-500' : item.iconClass
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <h3 className={`font-extrabold text-lg truncate ${isLocked ? 'text-slate-500' : 'text-slate-700'}`}>
                          {item.title}
                        </h3>
                        <span className="text-sm font-extrabold text-slate-400 shrink-0">
                          {Math.min(item.current, item.max)}/{item.max}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-500 mb-4 line-clamp-1">
                        {item.desc}
                      </p>
                      <div className={`h-3.5 w-full rounded-full overflow-hidden border ${
                        isLocked
                          ? 'bg-slate-200 border-slate-300/50'
                          : 'bg-slate-100 border-slate-200/50'
                      }`}>
                        <div
                          className={`h-full ${item.barColor} rounded-full relative overflow-hidden transition-all duration-500`}
                          style={{ width: `${progressPercent}%` }}
                        >
                          {progressPercent > 0 && (
                            <div className="absolute inset-0 bg-white/20 w-full h-1/3 rounded-t-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {achievements.length > 3 && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllAchievements((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 border-b-4 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-extrabold text-sm transition-all active:border-b-2 active:translate-y-0.5"
                  >
                    <span>
                      {showAllAchievements
                        ? t('Show Less', 'Tampilkan Lebih Sedikit')
                        : t(
                            `View All (${achievements.length}) Achievements`,
                            `Lihat Semua (${achievements.length}) Pencapaian`
                          )}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        showAllAchievements ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          )
        })()}
      </section>

      {avatarModalOpen && portalReady && createPortal(
        <div className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="avatar-dialog-title"
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[22rem] space-y-4 overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-5"
          >
            <div className="text-center">
              <h2 id="avatar-dialog-title" className="text-lg font-black text-slate-800">{t('Choose an Avatar', 'Pilih Avatar')}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {t('Pick a preset or upload your own.', 'Pilih preset atau unggah fotomu.')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAvatarUrl(url)
                    setAvatarModalOpen(false)
                    showToast(t('Avatar selected. Save to apply.', 'Avatar dipilih. Simpan untuk menerapkan.'), 'success')
                  }}
                  className="flex h-24 items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 p-2 transition hover:border-indigo-400 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 sm:h-28"
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">{t('OR', 'ATAU')}</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-100 py-3 font-extrabold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                {isUploading ? <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div> : <Upload className="w-5 h-5" />}
                {isUploading ? loadingText : t('Upload Custom Photo', 'Unggah Foto')}
              </button>
            </div>
            <button onClick={() => setAvatarModalOpen(false)} className="w-full rounded-xl py-2 font-extrabold text-xs text-slate-500 transition hover:bg-slate-50 hover:text-slate-700">
              {t('Cancel', 'Batal')}
            </button>
          </div>
        </div>,
        document.body,
      )}

      {portalReady && createPortal(
        <div
          className={`fixed bottom-6 left-1/2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 z-[10000] transition-all duration-300 ease-out transform ${toast.visible
              ? 'translate-y-0 opacity-100 scale-100'
              : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
            }`}
        >
          <div
            className={`px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-xl flex items-center gap-3 border-2 ${toast.type === 'success'
                ? 'profile-toast-success'
                : toast.type === 'warning'
                  ? 'profile-toast-warning'
                  : 'profile-toast-error'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6" />
            )}

            <span className="min-w-0 font-extrabold text-sm break-words">
              {toast.message}
            </span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}