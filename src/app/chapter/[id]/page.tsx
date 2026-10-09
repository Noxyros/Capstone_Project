'use client'

import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import Roadmap from '@/src/components/shared/Roadmap'
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
  const roadmapNodes = chapterData?.nodes ?? []

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="sticky top-4 z-30 flex items-center gap-4 mb-8 bg-white/90 backdrop-blur-md shadow-sm p-4 rounded-3xl border-2 border-slate-200">
        <button
          type="button"
          onClick={() => router.push(parentSubjectId ? `/subject/${parentSubjectId}` : '/')}
          aria-label={t('Back to subject', 'Kembali ke mata pelajaran')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
        >
          <ArrowLeft className="w-6 h-6 stroke-[3]" />
        </button>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide block">
            {t('Chapter Roadmap', 'Peta Belajar Bab')}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-700">
            {chapterData?.title ?? t('Unknown Chapter', 'Bab Tidak Dikenal')}
          </h1>
        </div>
      </div>

      <div className="bg-slate-50 rounded-3xl p-4 sm:p-8 overflow-hidden relative border-2 border-slate-200">
        {error ? (
          <p role="alert" className="py-10 text-center font-bold text-rose-700">{error}</p>
        ) : roadmapNodes.length > 0 ? (
          <Roadmap nodes={roadmapNodes} chapterId={chapterId} />
        ) : (
          <div className="text-center text-slate-400 font-bold py-10">
            {t('No lessons available for this chapter yet.', 'Belum ada pelajaran untuk bab ini.')}
          </div>
        )}
      </div>
    </div>
  )
}
