'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, RefreshCw, Target } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { loadWeakSkills as fetchWeakSkills, type WeakSkillArea } from '@/src/lib/practiceClient'

export default function WeakSkillsPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [areas, setAreas] = useState<WeakSkillArea[]>([])
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    async function loadWeakSkills() {
      setStatus('loading')
      try {
        const result = await fetchWeakSkills(userId, retryCount > 0)
        setAreas(result.areas)
        setStatus('loaded')
      } catch (error) {
        console.error('Failed to load weak quiz topics.', error)
        setStatus('error')
      }
    }

    void loadWeakSkills()
  }, [retryCount, user?.id])

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 px-4 sm:px-0">
      <div>
        <Link
          href="/practice"
          className="mb-5 inline-flex items-center gap-2 rounded-lg font-extrabold text-slate-500 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('Back to Practice', 'Kembali ke Latihan')}
        </Link>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-100 p-3 text-indigo-600">
            <Target className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl">
            {t('Weak Skills', 'Keahlian Lemah')}
          </h1>
        </div>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
          {t(
            'These are quiz topics where your best completed score is below 80%. They are based on your learning activity, not separate speaking or writing skill scores.',
            'Berikut topik kuis dengan nilai terbaik di bawah 80%. Rekomendasi ini berdasarkan aktivitas belajar, bukan nilai keterampilan berbicara atau menulis yang terpisah.'
          )}
        </p>
      </div>

      {status === 'loading' ? (
        <p className="rounded-2xl border-2 border-slate-200 bg-white p-5 font-semibold text-slate-500" role="status">
          {t('Loading your quiz topics...', 'Memuat topik kuis...')}
        </p>
      ) : status === 'error' ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-bold text-rose-700">
            {t('We could not load your weak quiz topics. Please try again.', 'Topik kuis belum dapat dimuat. Silakan coba lagi.')}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-4 font-extrabold text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
          >
            <RefreshCw className="h-4 w-4" />
            {t('Try again', 'Coba lagi')}
          </button>
        </div>
      ) : areas.length === 0 ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 shrink-0 text-emerald-600" />
            <h2 className="text-lg font-extrabold text-emerald-800">
              {t('No topics to revisit yet', 'Belum ada topik untuk diulang')}
            </h2>
          </div>
          <p className="mt-2 font-semibold leading-relaxed text-emerald-700">
            {t(
              'Complete a quiz to build your practice recommendations. Topics appear here when your best score is below 80%.',
              'Selesaikan kuis untuk membangun rekomendasi latihan. Topik akan muncul di sini jika nilai terbaikmu di bawah 80%.'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4" aria-label={t('Quiz topics to revisit', 'Topik kuis untuk diulang')}>
          {areas.map((area) => (
            <article
              key={area.nodeId}
              className="rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-indigo-500">
                    {area.submoduleTitle
                      ? `${area.chapterTitle} · ${area.submoduleTitle}`
                      : area.chapterTitle}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold text-slate-800">{area.nodeTitle}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {t('Best completed score', 'Nilai terbaik')}
                  </p>
                </div>
                <span className="w-fit rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-extrabold text-rose-700">
                  {area.score}%
                </span>
              </div>

              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={t(`${area.nodeTitle} best score`, `Nilai terbaik ${area.nodeTitle}`)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={area.score}
              >
                <div className="h-full rounded-full bg-rose-400" style={{ width: `${area.score}%` }} />
              </div>

              <Link
                href={`/chapter/${encodeURIComponent(area.chapterId)}/node/${encodeURIComponent(area.nodeId)}`}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 px-4 font-extrabold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
              >
                {t('Review this topic', 'Ulangi topik ini')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
