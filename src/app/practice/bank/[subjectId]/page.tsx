'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useAuth } from '@/src/context/AuthContext'
import { useUser } from '@/src/context/UserContext'
import { useParams } from 'next/navigation'
import {
  getCachedCurriculum,
  loadCurriculum,
  subscribeToCurriculumChanges,
} from '@/src/lib/curriculumClient'
import { localizeSubjectName } from '@/src/lib/curriculumLocalization'
import {
  getCachedBankChapters,
  loadBankChapters,
  subscribeToPracticeChanges,
  type BankChapter,
} from '@/src/lib/practiceClient'
import type { CurriculumSubject } from '@/src/lib/teacherContent'

type ErrorKind = 'auth' | 'load' | 'invalid' | null

function isBankChapter(value: unknown): value is BankChapter {
  return typeof value === 'object'
    && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'title' in value && typeof value.title === 'string'
    && 'order' in value && typeof value.order === 'number'
    && 'questionCount' in value && typeof value.questionCount === 'number'
}

export default function BankChapterPage() {
  const { t, language } = useLanguage()
  const { user } = useAuth()
  const { selectedGrade } = useUser()
  const params = useParams<{ subjectId: string }>()
  const subjectId = params.subjectId
  const curriculumScope = user?.id ?? 'public'
  const practiceScope = user?.id ?? 'public'

  // Read the existing curriculum cache during initialization.
  const [initialCurriculum] = useState<CurriculumSubject[] | null>(
    () => getCachedCurriculum(undefined, curriculumScope),
  )

  const [subjects, setSubjects] = useState<CurriculumSubject[]>(
    initialCurriculum ?? [],
  )

  const [isCurriculumLoading, setIsCurriculumLoading] = useState(
    initialCurriculum === null,
  )

  const [apiChapters, setApiChapters] = useState<BankChapter[] | null>(
    () => getCachedBankChapters(subjectId, practiceScope) ?? null,
  )
  const [isBankLoading, setIsBankLoading] = useState(
    getCachedBankChapters(subjectId, practiceScope) === null,
  )
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)

  const requestRef = useRef(0)
  const bankAbortRef = useRef<AbortController | null>(null)
  const hasCurriculumDataRef = useRef(initialCurriculum !== null)

  const subject = subjects.find((item) => item.id === subjectId)
  const cachedChapters = getBankChapters(subject)

  // Show cached data immediately.
  // The Bank endpoint replaces it when its exact result arrives.
  const chapters = apiChapters ?? cachedChapters

  const isGradeMismatch = Boolean(
    subject && subject.grade !== selectedGrade,
  )

  const fetchSubjects = useCallback(async (force = false) => {
    const requestId = ++requestRef.current

    if (!hasCurriculumDataRef.current) {
      setIsCurriculumLoading(true)
    }

    try {
      const result = await loadCurriculum(
        undefined,
        curriculumScope,
        force ? { force: true } : {},
      )

      if (requestId !== requestRef.current) return

      setSubjects(result)
      hasCurriculumDataRef.current = true
      setErrorKind(null)
    } catch (loadError) {
      if (requestId !== requestRef.current) return

      console.error(
        'Failed to load the bank subject curriculum.',
        loadError,
      )

      if (!hasCurriculumDataRef.current) {
        setErrorKind('load')
      }
    } finally {
      if (requestId === requestRef.current) {
        setIsCurriculumLoading(false)
      }
    }
  }, [curriculumScope])

  const loadBankChaptersData = useCallback(async () => {
    if (!user?.id || !subjectId) {
      setIsBankLoading(false)
      if (!user?.id) setErrorKind('auth')
      return
    }

    try {
      const result = await loadBankChapters(subjectId, practiceScope)

      setApiChapters(result)
      setErrorKind(null)
    } catch (loadError) {
      console.error('Failed to refresh bank chapters.', loadError)

      setErrorKind(
        loadError instanceof Error && loadError.message === 'invalid'
          ? 'invalid'
          : 'load',
      )
    } finally {
      setIsBankLoading(false)
    }
  }, [subjectId, practiceScope, user?.id])

  useEffect(() => {
    if (!user?.id) {
      setSubjects([])
      hasCurriculumDataRef.current = false
      setIsCurriculumLoading(false)
      setIsBankLoading(false)
      setApiChapters(null)
      setErrorKind('auth')
      return
    }

    const scopedCache = getCachedCurriculum(
      undefined,
      curriculumScope,
    )

    setSubjects(scopedCache ?? [])
    hasCurriculumDataRef.current = scopedCache !== null
    setIsCurriculumLoading(scopedCache === null)

    const cachedChapters = getCachedBankChapters(subjectId, practiceScope)
    setApiChapters(cachedChapters ?? null)
    setIsBankLoading(cachedChapters === null)
    setErrorKind(null)

    void fetchSubjects()
    void loadBankChaptersData()

    // Refresh after curriculum changes without removing visible cached data.
    const unsubscribeCurriculum = subscribeToCurriculumChanges(() => {
      setApiChapters(null)
      setIsBankLoading(true)

      void fetchSubjects(true)
      void loadBankChaptersData()
    })

    const unsubscribePractice = subscribeToPracticeChanges(() => {
      void loadBankChaptersData()
    })

    return () => {
      requestRef.current += 1
      bankAbortRef.current?.abort()
      unsubscribeCurriculum()
      unsubscribePractice()
    }
  }, [
    curriculumScope,
    practiceScope,
    fetchSubjects,
    loadBankChaptersData,
    subjectId,
    user?.id,
  ])

  const pageTitle = subject
    ? localizeSubjectName(subject.name, language)
    : isCurriculumLoading
      ? t('Loading subject…', 'Memuat subjek…')
      : t('Subject not found', 'Subjek tidak ditemukan')

  // Only show a loading panel when neither cached nor API data exists.
  const isLoading = chapters.length === 0
    && (
      (!subject && isCurriculumLoading)
      || (Boolean(subject) && isBankLoading && !errorKind)
    )

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 pb-10 sm:px-0">

      {/* Subject Header */}
      <header className="rounded-3xl border-2 border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4">

          <Link
            href="/practice/bank"
            aria-label={t('Back to subjects', 'Kembali ke subjek')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
          </Link>

          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
              {t('Subject', 'Subjek')}
            </p>

            <h1 className="truncate text-2xl font-black leading-tight tracking-tight text-slate-800 sm:text-3xl">
              {pageTitle}
            </h1>
          </div>

        </div>
      </header>

      {/* Authentication Error */}
      {errorKind === 'auth' ? (

        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-8 text-center" role="alert">
          <AlertCircle className="h-8 w-8 text-rose-600" />

          <h2 className="mt-3 text-base font-extrabold text-rose-800">
            {t('Sign in to access the question bank', 'Masuk untuk mengakses bank soal')}
          </h2>
        </div>

      ) : errorKind === 'load' && !subject && !isCurriculumLoading ? (

        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-8 text-center" role="alert">
          <AlertCircle className="h-8 w-8 text-rose-600" />

          <h2 className="mt-3 text-base font-extrabold text-rose-800">
            {t('Could not load modules', 'Tidak dapat memuat modul')}
          </h2>

          <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-rose-700">
            {t('Something went wrong while loading this subject.', 'Terjadi kesalahan saat memuat subjek ini.')}
          </p>

          <button
            type="button"
            onClick={() => void fetchSubjects(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-3.5 py-2 text-sm font-extrabold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('Try again', 'Coba lagi')}
          </button>
        </div>

      ) : isLoading ? (

        <div
          className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 py-8 text-center"
          role="status"
        >
          <LoaderCircle className="h-8 w-8 animate-spin text-emerald-500" />

          <p className="mt-3 text-sm font-bold text-slate-500">
            {t('Loading modules…', 'Memuat modul…')}
          </p>
        </div>

      ) : !subject ? (

        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-8 text-center">
          <h2 className="text-base font-extrabold text-rose-800">
            {t('Subject not found', 'Subjek tidak ditemukan')}
          </h2>

          <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-rose-700">
            {t('This subject is no longer available in the question bank.', 'Subjek ini tidak lagi tersedia di bank soal.')}
          </p>
        </div>

      ) : isGradeMismatch ? (

        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-amber-50 px-6 py-8 text-center">
          <h2 className="text-base font-extrabold text-amber-900">
            {t('Subject not available for this grade', 'Subjek tidak tersedia untuk kelas ini')}
          </h2>

          <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-amber-800">
            {t(
              `This subject is not part of Grade ${selectedGrade}. Select the matching grade to access it.`,
              `Subjek ini bukan bagian dari Kelas ${selectedGrade}. Pilih kelas yang sesuai untuk mengaksesnya.`,
            )}
          </p>
        </div>

      ) : errorKind && chapters.length === 0 ? (

        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-rose-200 bg-rose-50 px-6 py-8 text-center" role="alert">
          <AlertCircle className="h-8 w-8 text-rose-600" />

          <h2 className="mt-3 text-base font-extrabold text-rose-800">
            {errorKind === 'invalid'
              ? t('Invalid module data', 'Data modul tidak valid')
              : t('Could not load modules', 'Tidak dapat memuat modul')}
          </h2>

          <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-rose-700">
            {t('Something went wrong while refreshing this subject.', 'Terjadi kesalahan saat memperbarui subjek ini.')}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-rose-300 bg-white px-3.5 py-2 text-sm font-extrabold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4" />
            {t('Try again', 'Coba lagi')}
          </button>
        </div>

      ) : chapters.length === 0 ? (

        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
          <h2 className="text-base font-extrabold text-emerald-900">
            {t('No modules with questions', 'Belum ada modul dengan soal')}
          </h2>

          <p className="mt-1 max-w-md text-sm font-medium leading-relaxed text-emerald-800">
            {t(
              'This subject has no published questions yet.',
              'Subjek ini belum memiliki soal yang dipublikasikan.',
            )}
          </p>
        </div>

      ) : (

        /* Module List */
        <div className="space-y-2.5 sm:space-y-3">
          {chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/practice/bank/${subjectId}/${chapter.id}`}
              className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <article className="flex min-h-[76px] items-center justify-between rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3.5 transition-colors duration-500 hover:bg-emerald-50/40 sm:min-h-[82px] sm:px-5">

                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-extrabold leading-snug text-slate-700 transition-colors group-hover:text-emerald-700 sm:text-lg">
                    {chapter.title}
                  </h2>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                      {t('Module', 'Modul')} {chapter.order}
                    </span>

                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />

                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-emerald-700">
                      {chapter.questionCount}{' '}
                      {t(chapter.questionCount === 1 ? 'question' : 'questions', 'soal')}
                    </span>
                  </div>
                </div>

                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors group-hover:bg-emerald-600">
                  <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                </span>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function getBankChapters(subject: CurriculumSubject | undefined): BankChapter[] {
  if (!subject) return []

  return subject.chapters
    .map((chapter) => {
      const availableQuestionNodes = chapter.nodes.filter(
        (node) => node.status !== 'locked' && node.questions.length > 0,
      )

      const questionCount = availableQuestionNodes.reduce(
        (total, node) => total + node.questions.length,
        0,
      )

      return {
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        questionCount,
      }
    })
    .filter((chapter) => chapter.questionCount > 0)
}
