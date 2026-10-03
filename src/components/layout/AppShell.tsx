'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/src/components/layout/Sidebar'
import StatsPanel from '@/src/components/shared/StatsPanel'
import RightRail from '@/src/components/layout/RightRail'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isNodeActivity = /^\/chapter\/[^/]+\/node\/[^/]+$/.test(pathname)

  if (isNodeActivity) {
    return <main className="min-h-dvh w-full">{children}</main>
  }

  return (
    <>
      <div className="sticky top-0 z-40 border-b-2 border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md lg:hidden">
        <StatsPanel />
      </div>

      <div className="flex w-full">
        <aside className="relative z-30 hidden min-h-screen w-80 shrink-0 border-r-2 border-slate-200 bg-slate-50 lg:block">
          <div className="sticky top-0 h-screen p-6">
            <Sidebar />
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>

        <aside className="relative z-20 hidden min-h-screen w-80 shrink-0 border-l-2 border-slate-200 bg-slate-50 p-6 lg:block">
          <div className="sticky top-6 space-y-6">
            <StatsPanel />
            <RightRail />
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-slate-200 bg-white lg:hidden">
        <Sidebar mobile />
      </div>
    </>
  )
}
