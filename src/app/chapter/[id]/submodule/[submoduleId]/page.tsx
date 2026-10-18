'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Roadmap from '@/src/components/shared/Roadmap'
import { useLanguage } from '@/src/context/LanguageContext'
import { getCachedCurriculum, loadCurriculum, subscribeToCurriculumChanges } from '@/src/lib/curriculumClient'
import type { CurriculumChapter, CurriculumSubject } from '@/src/lib/teacherContent'
import { useAuth } from '@/src/context/AuthContext'

export default function SubmoduleRoadmapPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const curriculumScope = user?.id ?? 'public'
  const params = useParams<{ id: string; submoduleId: string }>()
  const { id: chapterId, submoduleId } = params
  const [subjects, setSubjects] = useState<CurriculumSubject[]>(() => getCachedCurriculum(undefined, curriculumScope) ?? [])
  const [isLoading, setIsLoading] = useState(() => getCachedCurriculum(undefined, curriculumScope) === null)
  const [error, setError] = useState('')

  const requestRef = useRef(0)

  const fetchSubjects = useCallback(async () => {
    const requestId = ++requestRef.current
    setIsLoading(true)
    setError('')
    try {
      const result = await loadCurriculum(undefined, curriculumScope, { force: true })
      if (requestId !== requestRef.current) return
      setSubjects(result)
    } catch (loadError) {
      if (requestId !== requestRef.current) return
      console.error('Failed to load submodule roadmap.', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Could not load this submodule.')
    } finally {
      if (requestId === requestRef.current) setIsLoading(false)
    }
  }, [curriculumScope])

  useEffect(() => {
    const unsubscribe = subscribeToCurriculumChanges(() => {
      void fetchSubjects()
    })
    void fetchSubjects()
    return () => unsubscribe()
  }, [fetchSubjects])

  const chapter: CurriculumChapter | undefined = subjects
    .flatMap((subject) => subject.chapters)
    .find((item) => item.id === chapterId)
  const submodule = chapter?.submodules.find((item) => item.id === submoduleId)
  const nodes = chapter?.nodes.filter((node) => node.submoduleId === submoduleId) ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-24">
      <header className="flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-4 shadow-sm">
        <Link
          href={`/chapter/${chapterId}`}
          aria-label={t('Back to module', 'Kembali ke modul')}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-6 w-6 stroke-[3]" />
        </Link>
        <div className="min-w-0">
          <span className="block truncate text-xs font-bold uppercase tracking-wide text-slate-400">{chapter?.title}</span>
          <h1 className="truncate text-2xl font-extrabold text-slate-700">
            {submodule?.title ?? (isLoading ? t('Loading submodule…', 'Memuat submodul…') : t('Unknown submodule', 'Submodul tidak dikenal'))}
          </h1>
        </div>
      </header>

      <div className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-50 p-4 sm:p-8">
        {error ? (
          <p role="alert" className="py-10 text-center font-bold text-rose-700">{error}</p>
        ) : isLoading && !submodule ? (
          <p role="status" className="py-10 text-center font-bold text-slate-500">
            {t('Loading your learning path…', 'Memuat peta belajarmu…')}
          </p>
        ) : nodes.length ? (
          <Roadmap nodes={nodes} chapterId={chapterId} />
        ) : (
          <p className="py-10 text-center font-bold text-slate-400">
            {t('No learning steps have been added to this submodule yet.', 'Belum ada langkah belajar di submodul ini.')}
          </p>
        )}
      </div>
    </div>
  )
}
