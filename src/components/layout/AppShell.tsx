'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/src/components/layout/Sidebar'
import StatsPanel from '@/src/components/shared/StatsPanel'
import RightRail from '@/src/components/layout/RightRail'
import AppLoadingScreen from '@/src/components/shared/AppLoadingScreen'
import { useAuth } from '@/src/context/AuthContext'
import { useLanguage } from '@/src/context/LanguageContext'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state, error, refreshProfile } = useAuth()
  const { t } = useLanguage()
  const [startupDelayElapsed, setStartupDelayElapsed] = useState(false)
  const isNodeActivity = /^\/chapter\/[^/]+\/node\/[^/]+$/.test(pathname)
  const learnerStats = state === 'signed_in'
    ? <StatsPanel />
    : state === 'loading'
      ? <p role="status" className="rounded-xl border-2 border-slate-200 bg-white p-3 text-sm font-bold text-slate-500">{t('Loading learner stats…', 'Memuat statistik belajar…')}</p>
      : state === 'profile_error' || state === 'configuration_error'
        ? (
          <div role="alert" className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
            <p>{error || t('Could not load your learner profile.', 'Tidak dapat memuat profil belajarmu.')}</p>
            {state === 'profile_error' && (
              <button
                type="button"
                onClick={() => void refreshProfile()}
                className="mt-2 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-rose-700"
              >
                {t('Try again', 'Coba lagi')}
              </button>
            )}
          </div>
        )
        : null

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setStartupDelayElapsed(true), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  if (state === 'loading' || !startupDelayElapsed) {
    return <main className="min-h-dvh"><AppLoadingScreen /></main>
  }

  if (pathname === '/login' || pathname.startsWith('/auth/')) {
    return <main className="min-h-dvh w-full">{children}</main>
  }

  if (isNodeActivity) {
    return <main className="min-h-dvh w-full">{children}</main>
  }

  return (
    <>
      <div className="sticky top-0 z-40 border-b-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
        {learnerStats}
      </div>

      <div className="flex w-full">
        <aside className="relative z-30 hidden min-h-screen w-80 shrink-0 border-r-2 border-slate-200 bg-slate-50 lg:block">
          <div className="sticky top-0 h-screen p-6">
            <Sidebar />
          </div>
        </aside>

        <main className="app-screen-pop min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>

        <aside className="relative z-20 hidden min-h-screen w-80 shrink-0 border-l-2 border-slate-200 bg-slate-50 p-6 lg:block">
          <div className="sticky top-6 space-y-6">
            {learnerStats}
            {state === 'signed_in' && <RightRail />}
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-slate-200 bg-white lg:hidden">
        <Sidebar mobile />
      </div>
    </>
  )
}
