'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  Calculator,
  Dna,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Laptop,
  Leaf,
  Music,
  Palette,
  Shield,
  Sparkles,
  Swords,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { useUser } from '@/src/context/UserContext'
import { localizeSubjectName } from '@/src/lib/curriculumLocalization'
import type { SubjectColor } from '@/src/lib/teacherContent'
import {
  getCachedBankSubjects,
  loadBankSubjects,
  subscribeToPracticeChanges,
  type BankSubject,
} from '@/src/lib/practiceClient'

type ErrorKind = 'auth' | 'load' | 'invalid' | null

type Theme = {
  tile: string
  badge: string
  text: string
  hover: string
  groupText: string
  button: string
}

const THEMES: Record<SubjectColor, Theme> = {
  blue: {
    tile: 'bg-sky-400 border-sky-600',
    badge: 'bg-sky-50 text-sky-600',
    text: 'text-sky-600',
    hover: 'hover:border-sky-300 hover:bg-sky-50/40',
    groupText: 'group-hover:text-sky-600',
    button: 'bg-sky-500',
  },
  green: {
    tile: 'bg-emerald-400 border-emerald-600',
    badge: 'bg-emerald-50 text-emerald-600',
    text: 'text-emerald-600',
    hover: 'hover:border-emerald-300 hover:bg-emerald-50/40',
    groupText: 'group-hover:text-emerald-600',
    button: 'bg-emerald-500',
  },
  rose: {
    tile: 'bg-rose-400 border-rose-600',
    badge: 'bg-rose-50 text-rose-600',
    text: 'text-rose-600',
    hover: 'hover:border-rose-300 hover:bg-rose-50/40',
    groupText: 'group-hover:text-rose-600',
    button: 'bg-rose-500',
  },
  amber: {
    tile: 'bg-amber-400 border-amber-600',
    badge: 'bg-amber-50 text-amber-600',
    text: 'text-amber-600',
    hover: 'hover:border-amber-300 hover:bg-amber-50/40',
    groupText: 'group-hover:text-amber-600',
    button: 'bg-amber-500',
  },
  purple: {
    tile: 'bg-purple-400 border-purple-600',
    badge: 'bg-purple-50 text-purple-600',
    text: 'text-purple-600',
    hover: 'hover:border-purple-300 hover:bg-purple-50/40',
    groupText: 'group-hover:text-purple-600',
    button: 'bg-purple-500',
  },
  cyan: {
    tile: 'bg-cyan-400 border-cyan-600',
    badge: 'bg-cyan-50 text-cyan-600',
    text: 'text-cyan-600',
    hover: 'hover:border-cyan-300 hover:bg-cyan-50/40',
    groupText: 'group-hover:text-cyan-600',
    button: 'bg-cyan-500',
  },
  orange: {
    tile: 'bg-orange-400 border-orange-600',
    badge: 'bg-orange-50 text-orange-600',
    text: 'text-orange-600',
    hover: 'hover:border-orange-300 hover:bg-orange-50/40',
    groupText: 'group-hover:text-orange-600',
    button: 'bg-orange-500',
  },
  indigo: {
    tile: 'bg-indigo-500 border-indigo-700',
    badge: 'bg-indigo-50 text-indigo-600',
    text: 'text-indigo-600',
    hover: 'hover:border-indigo-300 hover:bg-indigo-50/40',
    groupText: 'group-hover:text-indigo-600',
    button: 'bg-indigo-500',
  },
  teal: {
    tile: 'bg-teal-400 border-teal-600',
    badge: 'bg-teal-50 text-teal-600',
    text: 'text-teal-600',
    hover: 'hover:border-teal-300 hover:bg-teal-50/40',
    groupText: 'group-hover:text-teal-600',
    button: 'bg-teal-500',
  },
  red: {
    tile: 'bg-red-500 border-red-700',
    badge: 'bg-red-50 text-red-600',
    text: 'text-red-600',
    hover: 'hover:border-red-300 hover:bg-red-50/40',
    groupText: 'group-hover:text-red-600',
    button: 'bg-red-500',
  },
  lime: {
    tile: 'bg-lime-400 border-lime-600',
    badge: 'bg-lime-50 text-lime-700',
    text: 'text-lime-700',
    hover: 'hover:border-lime-300 hover:bg-lime-50/40',
    groupText: 'group-hover:text-lime-700',
    button: 'bg-lime-500',
  },
  pink: {
    tile: 'bg-pink-400 border-pink-600',
    badge: 'bg-pink-50 text-pink-600',
    text: 'text-pink-600',
    hover: 'hover:border-pink-300 hover:bg-pink-50/40',
    groupText: 'group-hover:text-pink-600',
    button: 'bg-pink-500',
  },
}

function SubjectIcon({ name }: { name: string | null }) {
  const props = {
    className: 'h-7 w-7 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]',
    strokeWidth: 2.25,
  }
  switch (name) {
    case 'calculator':
      return <Calculator {...props} />
    case 'flask':
      return <FlaskConical {...props} />
    case 'atom':
      return <Atom {...props} />
    case 'dna':
      return <Dna {...props} />
    case 'languages':
      return <Languages {...props} />
    case 'globe':
      return <Globe {...props} />
    case 'landmark':
      return <Landmark {...props} />
    case 'trending_up':
      return <TrendingUp {...props} />
    case 'shield':
      return <Shield {...props} />
    case 'laptop':
      return <Laptop {...props} />
    case 'palette':
      return <Palette {...props} />
    case 'music':
      return <Music {...props} />
    case 'activity':
      return <Activity {...props} />
    case 'users':
      return <Users {...props} />
    case 'leaf':
      return <Leaf {...props} />
    case 'sparkles':
      return <Sparkles {...props} />
    default:
      return <BookOpen {...props} />
  }
}

function PageHeader({ children, backHref }: { children?: React.ReactNode; backHref?: string }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center gap-4 mb-8">
      {backHref ? (
        <Link
          href={backHref}
          aria-label={t('Back to Practice', 'Kembali ke Latihan')}
          className="p-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl transition"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
      ) : (
        <div className="p-3 bg-emerald-100 rounded-2xl shadow-sm border-2 border-emerald-200 text-emerald-600 shrink-0">
          <BookOpen className="w-8 h-8" strokeWidth={2.5} />
        </div>
      )}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
          {t('Question Bank', 'Bank Soal')}
        </h1>
        {children}
      </div>
    </div>
  )
}

function EmptyChallenges({ grade }: { grade: number | string | null | undefined }) {
  const { t } = useLanguage()
  return (
    // Same card style as the Mistake Review empty state: soft emerald border + thick bottom edge.
    // Equal top/bottom padding so the button never floats far from the edge.
    <div className="rounded-3xl border-2 border-b-4 border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl border-b-4 border-emerald-600 bg-emerald-500 shadow-sm sm:h-24 sm:w-24">
        <Swords className="h-10 w-10 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] sm:h-11 sm:w-11" strokeWidth={2.25} />
      </div>

      {grade != null && grade !== '' && (
        <span className="mb-3 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-emerald-600">
          {t('Grade', 'Kelas')} {grade}
        </span>
      )}

      <h2 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">
        {t('No challenges yet', 'Belum ada tantangan')}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
        {t(
          'New challenges will show up here as soon as they’re added. Check back soon, or try another grade from the top bar.',
          'Tantangan baru akan muncul di sini begitu ditambahkan. Cek lagi nanti, atau coba kelas lain dari bilah atas.',
        )}
      </p>

      <Link
        href="/practice"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 px-6 font-extrabold text-white transition-all hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 active:translate-y-0.5 active:border-b-2"
      >
        {t('Back to Practice', 'Kembali ke Latihan')}
      </Link>
    </div>
  )
}

export default function BankSubjectPage() {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const { selectedGrade } = useUser()
  const scope = user?.id ?? 'public'

  const [subjects, setSubjects] = useState<BankSubject[]>(() => getCachedBankSubjects(scope) ?? [])
  const [isLoading, setIsLoading] = useState(getCachedBankSubjects(scope) === null)
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)

  const fetchSubjects = useCallback(async () => {
    try {
      setErrorKind(null)
      const result = await loadBankSubjects(scope)
      setSubjects(result)
    } catch (loadError) {
      console.error('Failed to load bank subjects.', loadError)
      if (subjects.length === 0) {
        setErrorKind('load')
      }
    } finally {
      setIsLoading(false)
    }
  }, [scope, subjects.length])

  useEffect(() => {
    if (!user?.id) {
      setSubjects([])
      setIsLoading(false)
      setErrorKind('auth')
      return
    }

    const cached = getCachedBankSubjects(scope)
    setSubjects(cached ?? [])
    setIsLoading(cached === null)
    setErrorKind(null)

    void fetchSubjects()

    const unsubscribe = subscribeToPracticeChanges(() => {
      void loadBankSubjects(scope, { force: true }).then((result) => {
        setSubjects(result)
      })
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, user?.id])

  const errorMessage =
    errorKind === 'auth'
      ? t('Please sign in to access the question bank.', 'Silakan masuk untuk mengakses bank soal.')
      : errorKind === 'invalid'
        ? t('Invalid subject data.', 'Data subjek tidak valid.')
        : t('Could not load subjects.', 'Tidak dapat memuat subjek.')

  const visibleSubjects = subjects.filter((subject) => subject.grade?.level === selectedGrade)
  const showEmpty = !isLoading && !errorKind && visibleSubjects.length === 0

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 pb-10 sm:px-0">
      <PageHeader backHref="/practice">
        <p className="text-sm font-semibold text-slate-500">
          {showEmpty
            ? t('Timed challenges to earn XP and gems.', 'Tantangan berwaktu untuk mendapat XP dan gems.')
            : t('Choose a subject to start the challenge.', 'Pilih subjek untuk memulai tantangan.')}
        </p>
        <span className="mt-2 inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
          {t('Timer · XP · Gems', 'Timer · XP · Gems')}
        </span>
      </PageHeader>

      {isLoading ? (
        <p className="rounded-2xl border-2 border-slate-200 bg-white p-5 font-semibold text-slate-500" role="status">
          {t('Loading question bank…', 'Memuat bank soal…')}
        </p>
      ) : errorKind ? (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5" role="alert">
          <p className="font-bold text-rose-700">{errorMessage}</p>
          {errorKind !== 'auth' && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-4 py-2 font-extrabold text-rose-700 hover:bg-rose-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('Try again', 'Coba lagi')}
            </button>
          )}
        </div>
      ) : showEmpty ? (
        <EmptyChallenges grade={selectedGrade} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleSubjects.map((subject) => {
            const theme = THEMES[subject.color as SubjectColor] ?? THEMES.green

            return (
              <Link key={subject.id} href={`/practice/bank/${subject.id}`} className="group block">
                <motion.div
                  whileHover={{ y: -4 }}
                  whileTap={{ y: 4, scale: 0.98 }}
                  className={`h-full rounded-2xl border-2 border-b-4 border-slate-200 bg-white p-5 flex flex-col gap-4 transition-all active:border-b-2 ${theme.hover}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-b-4 shadow-sm ${theme.tile}`}
                    >
                      <SubjectIcon name={subject.icon} />
                    </div>
                    <span className={`rounded-lg px-2 py-1 text-xs font-extrabold uppercase tracking-wide ${theme.badge}`}>
                      {subject.questionCount} {t(subject.questionCount === 1 ? 'question' : 'questions', 'soal')}
                    </span>
                  </div>

                  <h3 className={`text-lg font-extrabold text-slate-700 transition-colors ${theme.groupText}`}>
                    {localizeSubjectName(subject.name, language)}
                  </h3>

                  <div className="mt-auto flex items-center justify-between">
                    <span className={`text-xs font-extrabold uppercase tracking-wide ${theme.text}`}>
                      {t('Start challenge', 'Mulai tantangan')}
                    </span>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${theme.button}`}>
                      <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                    </span>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}