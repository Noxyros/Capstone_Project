'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import DailyQuizWidget from '@/src/components/widgets/DailyQuizWidget'
import DailyQuestCard from '@/src/components/widgets/DailyQuestCard'
import SubjectCard from '@/src/components/shared/SubjectCard'
import { GraduationCap, Plus, Target } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { getCachedCurriculum, loadCurriculum } from '@/src/lib/curriculumClient'
import type { CurriculumSubject } from '@/src/lib/teacherContent'

export default function HomePage() {
  const { t } = useLanguage()
  const { role, user } = useAuth()
  const curriculumScope = user?.id ?? 'public'
  const [subjects, setSubjects] = useState<CurriculumSubject[]>(() => getCachedCurriculum(undefined, curriculumScope) ?? [])
  const [curriculumError, setCurriculumError] = useState('')

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

  return (
    <div className="space-y-8">
      <DailyQuizWidget
        quizId="quiz-1"
        title={t("Are You Smarter Than a 7th Grader?", "Apakah Kamu Lebih Pintar dari Anak Kelas 7?")}
        prompt={t("What is the chemical symbol for Gold?", "Apa simbol kimia untuk Emas?")}
        options={[
          { id: '1', text: t('Ag (Silver)', 'Ag (Perak)'), isCorrect: false },
          { id: '2', text: t('Au (Gold)', 'Au (Emas)'), isCorrect: true },
          { id: '3', text: t('Fe (Iron)', 'Fe (Besi)'), isCorrect: false },
        ]}
        alreadyAttempted={false}
        xpReward={100}
        previewOnly
      />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-slate-700 flex items-center gap-2">
            <Target className="w-6 h-6 text-indigo-500" /> {t('Daily Quests', 'Misi Harian')}
          </h2>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            {t('Preview · tracking coming soon', 'Pratinjau · pelacakan segera hadir')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DailyQuestCard
            title={t("Perfect Lesson", "Pelajaran Sempurna")}
            description={t("Score 100% in any lesson", "Dapatkan skor 100% di pelajaran apa pun")}
            xpReward={20}
            current={1}
            target={1}
            previewOnly
          />
          <DailyQuestCard
            title={t("Quick Thinker", "Pemikir Cepat")}
            description={t("Complete a lesson under 3 mins", "Selesaikan pelajaran di bawah 3 menit")}
            xpReward={40}
            current={0}
            target={1}
            previewOnly
          />
        </div>
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
                name={subject.name}
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