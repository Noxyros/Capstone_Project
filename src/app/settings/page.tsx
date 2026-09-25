'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Globe, Volume2, Bell, Moon, Sun, HelpCircle, ChevronRight } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'
import { useTheme } from '@/src/context/ThemeContext'

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
  const { theme, setTheme } = useTheme()

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
              onClick={() => setLanguage('en')}
              className={`w-11 py-1.5 rounded-xl text-xs font-black transition text-center ${
                language === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
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

        <SettingsToggleRow
          icon={theme === 'dark' ? Moon : Sun}
          title={t('Dark Mode', 'Mode Gelap')}
          iconBg={theme === 'dark' ? 'bg-indigo-100' : 'bg-orange-50'}
          iconColor={theme === 'dark' ? 'text-indigo-600' : 'text-orange-500'}
          checked={theme === 'dark'}
          onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')}
        />

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

      {logoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <h2 className="text-xl font-black text-slate-800">{t('Log out?', 'Keluar dari akun?')}</h2>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              {t('Your learning progress is saved locally until cloud authentication is configured.', 'Kemajuan belajar kamu tersimpan lokal.')}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="flex-1 py-3 rounded-2xl font-extrabold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                {t('Cancel', 'Batal')}
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-1 py-3 rounded-2xl font-extrabold text-xs text-white bg-rose-600 hover:bg-rose-700 transition"
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