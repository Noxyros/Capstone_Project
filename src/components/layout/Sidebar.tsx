'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Compass, Dumbbell, Trophy, User, Ellipsis, Settings, CircleHelp, LogOut } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  const navItems = [
    { id: 'learn', name: t('Learn', 'Belajar'), href: '/', icon: Compass, color: 'text-indigo-500' },
    { id: 'practice', name: t('Practice', 'Latihan'), href: '/practice', icon: Dumbbell, color: 'text-emerald-500' },
    { id: 'leaderboard', name: t('Leaderboard', 'Liga'), href: '/leaderboard', icon: Trophy, color: 'text-amber-500' },
    { id: 'profile', name: t('Profile', 'Profil'), href: '/profile', icon: User, color: 'text-rose-500' },
  ]

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const moreActive = pathname === '/settings' || pathname === '/help'

  if (mobile) {
    return (
      <nav className="flex justify-around items-center p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.id} href={item.href}>
              <div className={`p-3 rounded-xl transition-all ${isActive ? 'bg-indigo-50 border-b-4 border-indigo-500 text-indigo-600' : 'text-slate-400'}`}>
                <item.icon className="w-6 h-6 stroke-2" />
              </div>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div>
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl border-b-4 border-indigo-800 flex items-center justify-center font-extrabold text-white text-xl">
            Q
          </div>
          <span className="font-extrabold text-2xl tracking-wide text-slate-700">
            QUEST<span className="text-indigo-600">LY</span>
          </span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.id} href={item.href}>
                <div className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-extrabold text-sm uppercase tracking-wide transition-all hover:bg-white hover:shadow-sm ${
                  isActive ? 'bg-white border-2 border-b-4 border-indigo-500 text-indigo-600' : 'text-slate-500 border-2 border-transparent'
                }`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                  <span>{item.name}</span>
                </div>
              </Link>
            )
          })}

          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-extrabold text-sm uppercase tracking-wide transition-all hover:bg-white hover:shadow-sm ${
                moreOpen || moreActive ? 'bg-white border-2 border-b-4 border-slate-300 text-slate-700' : 'text-slate-500 border-2 border-transparent'
              }`}
            >
              <Ellipsis className="w-6 h-6 text-violet-500" />
              <span>{t('More', 'Lainnya')}</span>
            </button>

            {moreOpen && (
              <div className="absolute left-full top-0 ml-3 w-52 bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-2 z-50">
                <Link
                  href="/settings"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Settings className="w-4 h-4" /> {t('Settings', 'Pengaturan')}
                </Link>
                <Link
                  href="/help"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  <CircleHelp className="w-4 h-4" /> {t('Help', 'Bantuan')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    setLogoutOpen(true)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" /> {t('Log out', 'Keluar')}
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {logoutOpen && (
        <div className="fixed inset-0 z-80 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-slate-100">
            <h2 className="text-lg font-extrabold text-slate-700">{t('Log out?', 'Keluar?')}</h2>
            <p className="text-sm font-semibold text-slate-500 mt-2 leading-relaxed">
              {t('Your streak stays saved. You can pick up tomorrow right where you left off.', 'Streak Anda tetap tersimpan. Anda dapat melanjutkannya besok tepat di tempat Anda berhenti.')}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="flex-1 py-2.5 rounded-2xl font-extrabold text-slate-600 bg-slate-100"
              >
                {t('Stay', 'Batal')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLogoutOpen(false)
                  router.push('/login')
                }}
                className="flex-1 py-2.5 rounded-2xl font-extrabold text-white bg-rose-500"
              >
                {t('Log out', 'Keluar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}