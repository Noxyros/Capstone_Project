'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Globe, Volume2, Bell, Moon, Sun, Monitor, HelpCircle, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import LogoutConfirmDialog from '@/src/components/shared/LogoutConfirmDialog'

interface SettingsToggleRowProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  iconBg: string
  iconColor: string
  checked: boolean
  onChange: (value: boolean) => void
}

function SettingsToggleRow({ icon: Icon, title, iconBg, iconColor, checked, onChange }: SettingsToggleRowProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors gap-3"
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`p-2.5 ${iconBg} rounded-xl ${iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-extrabold text-slate-800 text-sm truncate">{title}</span>
      </div>
      
      <div
        className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 shrink-0 ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { signOut } = useAuth()

  const [sound, setSound] = useState(true)
  const [reminders, setReminders] = useState(true)
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      
      {/* Mobile Top Header */}
      <div className="flex md:hidden items-center justify-between pt-1 pb-2">
        <h1 className="text-xl font-black text-slate-800">{t('Settings', 'Pengaturan')}</h1>
        <button 
          onClick={() => router.push('/profile')} 
          className="text-sky-500 hover:text-sky-600 font-black text-xs uppercase tracking-wider"
        >
          {t('DONE', 'SELESAI')}
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t('Settings', 'Pengaturan')}</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">
          {t('Preferences, language options, and account management.', 'Preferensi, pilihan bahasa, dan manajemen akun.')}
        </p>
      </div>

      {/* Settings Card */}
      <div className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-100">
        
        {/* Language Row with Compact EN / ID Toggle */}
        <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-slate-800 text-sm truncate">{t('App Language', 'Bahasa Aplikasi')}</p>
              <p className="text-xs text-slate-400 font-medium truncate">{t('Select interface language', 'Pilih bahasa tampilan')}</p>
            </div>
          </div>

          {/* Fixed-width EN / BI Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              aria-label={t('English', 'Bahasa Inggris')}
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
              className={`w-11 py-1.5 rounded-xl text-xs font-black transition text-center ${
                language === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              aria-label={t('Indonesian', 'Bahasa Indonesia')}
              aria-pressed={language === 'id'}
              onClick={() => setLanguage('id')}
              className={`w-11 py-1.5 rounded-xl text-xs font-black transition text-center ${
                language === 'id' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ID
            </button>
          </div>
        </div>

        <SettingsToggleRow
          icon={Volume2}
          title={t('Sound Effects', 'Efek Suara')}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          checked={sound}
          onChange={setSound}
        />

        <SettingsToggleRow
          icon={Bell}
          title={t('Daily Reminders', 'Pengingat Harian')}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          checked={reminders}
          onChange={setReminders}
        />

        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`shrink-0 rounded-xl p-2.5 ${resolvedTheme === 'dark' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-50 text-orange-500'}`}>
              {theme === 'system' ? <Monitor className="h-5 w-5" /> : resolvedTheme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-800">{t('Appearance', 'Tampilan')}</p>
              <p className="truncate text-xs font-medium text-slate-400">
                {t('Choose how Questly looks', 'Pilih tampilan Questly')}
              </p>
            </div>
          </div>
          <div role="group" aria-label={t('Theme preference', 'Preferensi tema')} className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-100 p-1 sm:w-auto">
            {([
              { value: 'system', label: t('System', 'Sistem'), icon: Monitor },
              { value: 'light', label: t('Light', 'Terang'), icon: Sun },
              { value: 'dark', label: t('Dark', 'Gelap'), icon: Moon },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-extrabold transition sm:px-3 ${
                  theme === value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile-Only Help Center Option */}
        <Link
          href="/help"
          className="p-4 sm:p-5 flex md:hidden items-center justify-between hover:bg-slate-50 transition-colors gap-3"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 bg-teal-50 rounded-xl text-teal-600 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-slate-800 text-sm truncate">
                {t('Help Center', 'Pusat Bantuan')}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setLogoutOpen(true)}
        className="w-full py-4 bg-rose-50 border-2 border-rose-100 rounded-2xl font-extrabold text-rose-600 hover:bg-rose-100 transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" />
        {t('Log Out', 'Keluar')}
      </button>

      <LogoutConfirmDialog
        open={logoutOpen}
        t={t}
        onClose={() => setLogoutOpen(false)}
        onConfirm={async () => {
          await signOut()
          router.replace('/login')
        }}
      />
    </div>
  )
}