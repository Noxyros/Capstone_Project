'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  History,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { useParams } from 'next/navigation'
import { getCachedCurriculum } from '@/src/lib/curriculumClient'
import {
  getCachedBankSubmodules,
  loadBankSubmodules,
  subscribeToPracticeChanges,
  type BankSubmodule,
} from '@/src/lib/practiceClient'

const COMPLETED_KEY = 'questly_bank_completed'

function getCompletedKey(userId: string): string {
  return `${COMPLETED_KEY}_${userId}`
}

function getCompletedSubmodules(userId: string): Set<string> {
  if (!userId || typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(getCompletedKey(userId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function isSubmoduleCompleted(userId: string, submoduleId: string): boolean {
  return getCompletedSubmodules(userId).has(submoduleId)
}

type BankSubmoduleView = {
  id: string
  title: string
  order: number
  questionCount: number
  nodes: Array<{
    id: string
    title: string
    order: number
    type: string
    questionCount: number
  }>
}

type ErrorKind = 'load' | 'invalid' | null

export default function BankSubmodulePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const params = useParams<{ subjectId: string; chapterId: string }>()
  const subjectId = params.subjectId
  const chapterId = params.chapterId
  const scope = user?.id ?? 'public'

  const [submodules, setSubmodules] = useState<BankSubmoduleView[]>(() =>
    getCachedBankSubmodules(subjectId, chapterId, scope) ?? [],
  )
  const [isLoading, setIsLoading] = useState(
    getCachedBankSubmodules(subjectId, chapterId, scope) === null,
  )
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)
  const [chapterTitle, setChapterTitle] = useState('')

  useEffect(() => {
    const subjects = getCachedCurriculum(undefined, scope)
    if (!subjects) return
    const chapter = subjects
      .flatMap((subject) => subject.chapters)
      .find((chapter) => chapter.id === chapterId)
    if (chapter) setChapterTitle(chapter.title)
  }, [scope, chapterId])

  const loadSubmodules = useCallback(async (force = false) => {
    if (!user?.id || !subjectId || !chapterId) {
      setIsLoading(false)
      return
    }

    setErrorKind(null)
    try {
      const result = await loadBankSubmodules(subjectId, chapterId, scope, { force })
      setSubmodules(result)
    } catch (loadError) {
      console.error('Failed to load bank submodules.', loadError)
      setErrorKind(
        loadError instanceof Error && loadError.message === 'invalid'
          ? 'invalid'
          : 'load',
      )
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, subjectId, chapterId, scope])

  useEffect(() => {
    if (!user?.id || !subjectId || !chapterId) {
      setIsLoading(false)
      return
    }

    const cached = getCachedBankSubmodules(subjectId, chapterId, scope)
    setSubmodules(cached ?? [])
    setIsLoading(cached === null)
    setErrorKind(null)

    void loadSubmodules()

    const unsubscribe = subscribeToPracticeChanges(() => {
      void loadSubmodules(true)
    })

    return () => unsubscribe()
  }, [scope, loadSubmodules, user?.id, subjectId, chapterId])

  const backHref = `/practice/bank/${subjectId}`

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-10 sm:px-0">
      {/* Submodule Header */}
      <header className="rounded-3xl border-2 border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href={backHref}
            aria-label={t('Back to chapters', 'Kembali ke bab')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
          </Link>

          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              {t('Module', 'Modul')}
            </p>

            <h1 className="truncate text-2xl font-black leading-tight tracking-tight text-slate-800 sm:text-3xl">
              {chapterTitle || t('Module', 'Modul')}
            </h1>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 py-10 text-center"
          role="status"
        >
          <LoaderCircle className="h-9 w-9 animate-spin text-emerald-500" />
          <p className="mt-4 text-base font-extrabold text-slate-700">
            {t('Loading submodules…', 'Memuat submodul…')}
          </p>
          <p className="mt-1 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
            {t(
              'Getting the available question sets ready.',
              'Menyiapkan kumpulan soal yang tersedia.',
            )}
          </p>
        </div>
      ) : errorKind ? (
        <div
          className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-10 text-center"
          role="alert"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-b-4 border-rose-300 bg-rose-100 text-rose-600">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-rose-800">
            {t('Could not load submodules', 'Tidak dapat memuat submodul')}
          </h2>
          <p className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-rose-700">
            {errorKind === 'invalid'
              ? t('The submodule data is invalid.', 'Data submodul tidak valid.')
              : t('Something went wrong while loading this chapter.', 'Terjadi kesalahan saat memuat bab ini.')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-4 py-2.5 text-sm font-extrabold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('Try again', 'Coba lagi')}
          </button>
        </div>
      ) : submodules.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-b-4 border-emerald-700 bg-emerald-500 text-white shadow-sm">
            <BookOpen className="h-7 w-7" strokeWidth={2.25} />
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-emerald-900">
            {t('No submodules with questions', 'Belum ada submodul dengan soal')}
          </h2>
          <p className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-emerald-800">
            {t(
              'This chapter has no published questions yet.',
              'Bab ini belum memiliki soal yang dipublikasikan.',
            )}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2.5 sm:space-y-3">
            {submodules.map((submodule) => {
              const isCompleted = user?.id ? isSubmoduleCompleted(user.id, submodule.id) : false
              const challengeHref = `/practice/bank/${subjectId}/${chapterId}/${submodule.id}`
              return (
                <article
                  key={submodule.id}
                  className={`flex min-h-[76px] items-center gap-2 rounded-2xl border-2 border-b-4 ${
                    isCompleted ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                  } px-3 py-3.5 transition-colors duration-500 hover:border-emerald-300 hover:bg-emerald-50/40 sm:min-h-[82px] sm:px-4`}
                >
                  <Link
                    href={challengeHref}
                    className="group flex min-w-0 flex-1 items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-base font-extrabold leading-snug text-slate-700 transition-colors group-hover:text-emerald-700 sm:text-lg">
                        {submodule.title}
                      </h2>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                          {t('Submodule', 'Submodul')} {submodule.order}
                        </span>

                        <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />

                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-emerald-700">
                          {submodule.questionCount}{' '}
                          {t(submodule.questionCount === 1 ? 'question' : 'questions', 'soal')}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2">
                    {isCompleted && (
                      <Link
                        href={`${challengeHref}?view=history`}
                        aria-label={t(`View attempt history for ${submodule.title}`, `Lihat riwayat percobaan ${submodule.title}`)}
                        title={t('Attempt history', 'Riwayat percobaan')}
                        className="bank-submodule-action flex h-9 w-9 items-center justify-center rounded-xl border-2 border-emerald-100 bg-white text-emerald-600 transition-colors hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                      >
                        <History className="h-5 w-5" strokeWidth={2.25} />
                      </Link>
                    )}
                    <Link
                      href={challengeHref}
                      aria-label={t(`Start ${submodule.title}`, `Mulai ${submodule.title}`)}
                      title={t('Start a new random set', 'Mulai kumpulan soal acak baru')}
                      className="bank-submodule-action flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                    >
                      <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}