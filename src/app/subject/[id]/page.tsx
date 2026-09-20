'use client'

import React from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, Lock, Play } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export default function SubjectDetailPage() {
  const { t } = useLanguage()
  const params = useParams()
  const subjectId = params?.id as string

  // Moved inside the component so it can use the `t()` function dynamically
  const MOCK_SUBJECT_DATA: Record<string, { name: string; chapters: Array<{ id: string; title: string; order: number; status: 'completed' | 'in_progress' | 'locked' }> }> = {
    'math-1': {
      name: t('Mathematics', 'Matematika'),
      chapters: [
        { id: 'ch-1', title: t('Exponents & Powers', 'Eksponen & Pangkat'), order: 1, status: 'completed' },
        { id: 'ch-2', title: t('Introduction to Logarithms', 'Pengenalan Logaritma'), order: 2, status: 'in_progress' },
        { id: 'ch-3', title: t('Linear Equations in One Variable', 'Persamaan Linear Satu Variabel'), order: 3, status: 'locked' },
      ],
    },
    'science-1': {
      name: t('Science & Biology', 'Sains & Biologi'),
      chapters: [
        { id: 'ch-4', title: t('Photosynthesis & Plant Energy', 'Fotosintesis & Energi Tumbuhan'), order: 1, status: 'completed' },
        { id: 'ch-5', title: t('Atoms, Elements & Compounds', 'Atom, Unsur & Senyawa'), order: 2, status: 'locked' },
      ],
    },
  }

  const subject = MOCK_SUBJECT_DATA[subjectId] || {
    name: t('Subject Modules', 'Modul Pelajaran'),
    chapters: [
      { id: 'ch-1', title: t('Exponents & Powers', 'Eksponen & Pangkat'), order: 1, status: 'completed' },
      { id: 'ch-2', title: t('Introduction to Logarithms', 'Pengenalan Logaritma'), order: 2, status: 'in_progress' },
      { id: 'ch-3', title: t('Linear Equations', 'Persamaan Linear'), order: 3, status: 'locked' },
    ],
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl transition">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-700">{subject.name}</h1>
          <p className="text-sm font-semibold text-slate-400">
            {t('Select a module to continue learning', 'Pilih modul untuk melanjutkan belajar')}
          </p>
        </div>
      </div>

      {/* Chapters / Modules List */}
      <div className="space-y-3">
        {subject.chapters.map((chapter) => {
          const isCompleted = chapter.status === 'completed'
          const isInProgress = chapter.status === 'in_progress'
          const isLocked = chapter.status === 'locked'

          return (
            <div
              key={chapter.id}
              className={`bg-white border-2 border-b-4 rounded-2xl p-5 flex items-center justify-between transition-all ${
                isLocked 
                  ? 'border-slate-200 opacity-60' 
                  : isInProgress 
                  ? 'border-indigo-500 shadow-sm' 
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {isCompleted && <CheckCircle2 className="w-7 h-7 text-emerald-500 fill-emerald-100" />}
                  {isInProgress && <Circle className="w-7 h-7 text-indigo-500 stroke-[2.5]" />}
                  {isLocked && <Lock className="w-6 h-6 text-slate-400" />}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    {t('Module', 'Modul')} {chapter.order}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-700">{chapter.title}</h3>
                </div>
              </div>

              <div>
                {!isLocked ? (
                  <Link
                    href={`/chapter/${chapter.id}`}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-xs uppercase tracking-wide border-b-4 ${
                      isInProgress
                        ? 'bg-indigo-600 text-white border-indigo-800'
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {isInProgress ? t('Start', 'Mulai') : t('Review', 'Ulangi')}
                  </Link>
                ) : (
                  <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-xl">
                    {t('Locked', 'Terkunci')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}