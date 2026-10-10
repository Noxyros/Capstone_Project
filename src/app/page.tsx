'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import DailyQuizWidget from '@/src/components/widgets/DailyQuizWidget'
import DailyQuestCard from '@/src/components/widgets/DailyQuestCard'
import DailyResetCountdown from '@/src/components/widgets/DailyResetCountdown'
import SubjectCard from '@/src/components/shared/SubjectCard'
import { GraduationCap, Plus, Target } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { getCachedCurriculum, loadCurriculum } from '@/src/lib/curriculumClient'
import { localizeSubjectName } from '@/src/lib/curriculumLocalization'
import type { CurriculumSubject } from '@/src/lib/teacherContent'
import { isDailyQuestProgress, type DailyQuestProgress } from '@/src/lib/dailyQuests'
import { cacheDailyQuests, getCachedDailyQuests } from '@/src/lib/dailyQuestClient'
import { isAppProfile } from '@/src/lib/appProfile'
import { useJakartaDailyReset } from '@/src/hooks/useJakartaDailyReset'

export default function HomePage() {
  const { t, language } = useLanguage()
  const { role, user, updateProfile } = useAuth()
  const { dateKey: dailyResetDate, secondsRemaining } = useJakartaDailyReset()
  const curriculumScope = user?.id ?? 'public'
  const [subjects, setSubjects] = useState<CurriculumSubject[]>(() => getCachedCurriculum(undefined, curriculumScope) ?? [])
  const [curriculumError, setCurriculumError] = useState('')
  const [dailyQuests, setDailyQuests] = useState<DailyQuestProgress[] | null>(() =>
    user?.id ? getCachedDailyQuests(user.id)?.quests ?? null : null)
  const [dailyQuestError, setDailyQuestError] = useState('')

  useEffect(() => {
    let active = true
    void loadCurriculum(undefined, curriculumScope)
      .then((result) => { if (active) setSubjects(result) })
      .catch((error) => {
        console.error('Failed to load learner curriculum.', error)
        if (active) setCurriculumError(error instanceof Error ? error.message : t('Could not load subjects.', 'Tidak dapat memuat mata pelajaran.'))
      })
    return () => { active = false }
  }, [curriculumScope, t])

  const loadDailyQuests = useCallback(async () => {
    const response = await fetch('/api/daily-quests', { cache: 'no-store' })
    let result: unknown
    try {
      result = await response.json()
    } catch {
      throw new Error(t('Daily quests returned an unreadable response.', 'Misi harian mengirim respons yang tidak terbaca.'))
    }
    if (!response.ok) {
      const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
        ? result.error
        : t('Could not load daily quests.', 'Tidak dapat memuat misi harian.')
      throw new Error(message)
    }
    if (
      typeof result !== 'object'
      || result === null
      || !('quests' in result)
      || !Array.isArray(result.quests)
      || result.quests.length > 3
      || !result.quests.every(isDailyQuestProgress)
    ) {
      throw new Error(t('The server returned invalid daily quest data.', 'Server mengirim data misi harian yang tidak valid.'))
    }
    if ('profile' in result) {
      if (!isAppProfile(result.profile)) {
        throw new Error(t('The server returned invalid learner profile data.', 'Server mengirim data profil pelajar yang tidak valid.'))
      }
      updateProfile(result.profile)
    }
    cacheDailyQuests(user?.id ?? '', result.quests)
    setDailyQuests(result.quests)
    setDailyQuestError('')
  }, [t, updateProfile, user?.id])

  useEffect(() => {
    let active = true
    const cached = getCachedDailyQuests(user?.id ?? '')
    if (cached) {
      setDailyQuests(cached.quests)
      if (cached.isFresh) {
        setDailyQuestError('')
        return () => { active = false }
      }
    } else {
      setDailyQuests(null)
    }

    void loadDailyQuests().catch((error) => {
      console.error('Failed to load daily quests.', error)
      if (active) setDailyQuestError(error instanceof Error
        ? error.message
        : t('Could not load daily quests.', 'Tidak dapat memuat misi harian.'))
    })
    return () => { active = false }
  }, [dailyResetDate, loadDailyQuests, user?.id, t])

  return (
    <div className="space-y-8">
      <DailyQuizWidget dailyResetDate={dailyResetDate} secondsUntilReset={secondsRemaining} />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-700 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-500" /> {t('Daily Quests', 'Misi Harian')}
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
            <span className="uppercase tracking-wide">{t('3 quests', '3 misi')}</span>
            <DailyResetCountdown secondsRemaining={secondsRemaining} />
          </div>
        </div>
        {dailyQuestError && (
          <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            <span>{dailyQuestError}</span>
            <button type="button" onClick={() => void loadDailyQuests().catch((error) => setDailyQuestError(error instanceof Error ? error.message : t('Could not load daily quests.', 'Tidak dapat memuat misi harian.')))} className="underline underline-offset-2">
              {t('Retry', 'Coba lagi')}
            </button>
          </div>
        )}
        {dailyQuests ? (
          dailyQuests.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-500">
              {t('Daily quests will appear when a learning path is published.', 'Misi harian akan muncul setelah peta belajar dipublikasikan.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dailyQuests.map((quest) => (
                <DailyQuestCard
                  key={quest.id}
                  quest={quest}
                  current={quest.current}
                  rewarded={quest.rewarded}
                />
              ))}
            </div>
          )
        ) : !dailyQuestError ? (
          <p role="status" className="rounded-2xl border-2 border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-500">
            {t('Loading your daily quests…', 'Memuat misi harian…')}
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-slate-700 mb-4">{t('Your Subjects', 'Mata Pelajaranmu')}</h2>
        {curriculumError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{curriculumError}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((subject) => {
            const nodes = subject.chapters.flatMap((chapter) => chapter.nodes)
            const completed = nodes.filter((node) => node.status === 'completed').length
            return (
              <SubjectCard
                key={subject.id}
                id={subject.id}
                name={localizeSubjectName(subject.name, language)}
                color={subject.color}
                progress={nodes.length === 0 ? 0 : Math.round(completed / nodes.length * 100)}
                iconType={subject.icon}
              />
            )
          })}
          {!curriculumError && subjects.length === 0 && (
            <p className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center font-bold text-slate-500">
              {t('No published subjects are available yet.', 'Belum ada mata pelajaran yang dipublikasikan.')}
            </p>
          )}
        </div>
        {(role === 'TEACHER' || role === 'ADMIN') && (
          <Link
            href="/teacher"
            className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/70 p-4 transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-indigo-600">
              <Plus className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-extrabold text-slate-700">
                <GraduationCap className="h-4 w-4 text-indigo-500" />
                {t('Teacher workspace', 'Ruang kerja guru')}
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-slate-500">
                {t('Create and organize a learning path', 'Buat dan susun peta belajar')}
              </span>
            </span>
          </Link>
        )}
      </section>
    </div>
  )
}