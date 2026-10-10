'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, CheckCircle2, Lock, Play } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useLanguage } from '@/src/context/LanguageContext'
import { getCachedCurriculum, loadCurriculum } from '@/src/lib/curriculumClient'
import type { CurriculumSubject } from '@/src/lib/teacherContent'
import { useAuth } from '@/src/context/AuthContext'

export default function ChapterRoadmapPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const curriculumScope = user?.id ?? 'public'
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const chapterId = params.id
  const [subjects, setSubjects] = useState<CurriculumSubject[]>(() => getCachedCurriculum(undefined, curriculumScope) ?? [])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void loadCurriculum(undefined, curriculumScope)
      .then((result) => { if (active) setSubjects(result) })
      .catch((loadError) => {
        console.error('Failed to load learner curriculum.', loadError)
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this roadmap.')
      })
    return () => { active = false }
  }, [chapterId, curriculumScope])

  const chapterData = subjects.flatMap((subject) => subject.chapters).find((chapter) => chapter.id === chapterId)
  const parentSubjectId = subjects.find((subject) => subject.chapters.some((chapter) => chapter.id === chapterId))?.id
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <header className="sticky top-4 z-30 flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.push(parentSubjectId ? `/subject/${parentSubjectId}` : '/')}
          aria-label={t('Back to subject', 'Kembali ke mata pelajaran')}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-6 w-6 stroke-[3]" />
        </button>
        <div>
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-400">
            {t('Module', 'Modul')}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-700">
            {chapterData?.title ?? t('Unknown Module', 'Modul tidak dikenal')}
          </h1>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}

      {chapterData && (
        <div className="space-y-3">
          {chapterData.submodules.map((submodule) => {
            const nodes = chapterData.nodes.filter((node) => node.submoduleId === submodule.id)
            const completedCount = nodes.filter((node) => node.status === 'completed').length
            const completed = nodes.length > 0 && completedCount === nodes.length
            const progress = nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0
            const locked = !submodule.isPublished || chapterData.chaptersStatus === 'locked'
            return (
              <article
                key={submodule.id}
                className={`submodule-progress-card rounded-3xl border bg-gradient-to-br from-white to-indigo-50/70 p-5 shadow-sm transition-colors ${
                  locked ? 'border-slate-200 opacity-60' : completed ? 'border-emerald-200' : 'border-indigo-100 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                    locked ? 'bg-slate-100 text-slate-400' : completed ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {locked
                      ? <Lock className="h-5 w-5" />
                      : completed
                        ? <CheckCircle2 className="h-6 w-6" />
                        : <BookOpen className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-extrabold text-slate-700">{submodule.title}</h2>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        aria-label={t(`${completedCount} of ${nodes.length} steps completed`, `${completedCount} dari ${nodes.length} langkah selesai`)}
                        className={`submodule-step-count rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                          completed ? 'is-complete bg-emerald-100 text-emerald-700' : 'bg-white/80 text-indigo-700'
                        }`}
                      >
                        {completedCount}<span className="mx-1 opacity-50">/</span>{nodes.length}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{t('steps completed', 'langkah selesai')}</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={t(`${submodule.title} progress`, `Progres ${submodule.title}`)}
                      aria-valuemin={0}
                      aria-valuemax={nodes.length}
                      aria-valuenow={completedCount}
                      className="submodule-progress-track mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100"
                    >
                      <div
                        className={`h-full rounded-full transition-[width] ${completed ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {!locked ? (
                    <Link
                      href={`/chapter/${chapterId}/submodule/${submodule.id}`}
                      className={`flex shrink-0 items-center gap-2 rounded-xl border-b-4 px-4 py-2 text-xs font-extrabold uppercase tracking-wide ${
                        completed ? 'border-emerald-700 bg-emerald-500 text-white' : 'border-indigo-800 bg-indigo-600 text-white'
                      }`}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      {completed ? t('Review', 'Ulangi') : t('Start', 'Mulai')}
                    </Link>
                  ) : (
                    <span className="shrink-0 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase text-slate-400">
                      {t('Locked', 'Terkunci')}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {chapterData && chapterData.submodules.length === 0 && (
        <p className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center font-bold text-slate-500">
          {t('No submodules have been added yet.', 'Belum ada submodul.')}
        </p>
      )}
    </div>
  )
}
