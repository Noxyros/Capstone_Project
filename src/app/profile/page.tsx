'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Flame, Heart, Zap, Trophy, Medal, User, Sparkles,
  Pencil, AtSign, Upload, CheckCircle2, AlertCircle,
  Settings
} from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Questly4',
]

export default function ProfilePage() {
  const { t } = useLanguage()

  const user = {
    streakDays: 12,
    totalXp: 450,
    rank: 2,
    hearts: 5,
    maxHearts: 5,
  }

  const originalName = 'Alex Developer'
  const originalHandle = 'alex_dev'
  const originalAvatarUrl = 'https://ui-avatars.com/api/?name=Alex+Developer&background=e0e7ff&color=4f46e5&size=150&font-weight=bold'

  const [name, setName] = useState(originalName)
  const [handle, setHandle] = useState(originalHandle)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(originalAvatarUrl)

  const [isUploading, setIsUploading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ visible: true, message, type })
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 3500)
  }

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase() || '??'

  const hasChanges = name !== originalName || handle !== originalHandle || avatarUrl !== originalAvatarUrl

  const handleSaveChanges = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsSaving(false)
    showToast(t('Profile updated successfully!', 'Profil berhasil diperbarui!'), 'success')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setLoadingText(t('Scanning & Uploading...', 'Memindai & Mengunggah...'))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('handle', handle)

      const res = await fetch('/api/moderate', { method: 'POST', body: formData })

      let data: any = {}
      try {
        data = await res.json()
      } catch (parseError) {
        showToast(t('Error connecting to server. Please try again.', 'Gagal terhubung ke server. Coba lagi.'), 'error')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (!res.ok || !data.allowed) {
        showToast(
          t('Image flagged as inappropriate. Please choose another.', 'Gambar ditandai tidak pantas. Silakan pilih gambar lain.'),
          'warning'
        )
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setAvatarUrl(data.url)
      setAvatarModalOpen(false)
      showToast(t('Avatar updated securely!', 'Avatar berhasil diperbarui!'), 'success')

    } catch (error) {
      showToast(t('Error connecting to server. Please try again.', 'Gagal terhubung ke server. Coba lagi.'), 'error')
    } finally {
      setIsUploading(false)
      setLoadingText('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10 relative">

      {/* Mobile Top Header (Hidden on Desktop) */}
      <div className="flex items-center justify-center md:hidden px-1 mb-2">
        <h1 className="text-xl font-extrabold text-slate-700">{t('Profile', 'Profil')}</h1>
      </div>

      <section className="bg-white border-2 border-b-[6px] border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative transition-transform">
        <Link href="/settings" className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-slate-600 transition-colors p-1 z-10">
          <Settings className="w-6 h-6" />
        </Link>

        <div className="shrink-0 relative group cursor-pointer" onClick={() => setAvatarModalOpen(true)}>
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-20 transform translate-y-2"></div>
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[6px] border-white shadow-[0_0_0_2px_theme(colors.slate.100)] bg-indigo-50 text-indigo-600 flex items-center justify-center text-4xl font-black overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : getInitials(name)}
          </div>
          <div className="absolute bottom-0 right-0 bg-slate-800 text-white p-2.5 rounded-full border-2 border-white group-hover:bg-indigo-600 shadow-md transition-colors z-10">
            <Pencil className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 space-y-4 w-full">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {t('Display Name', 'Nama Tampilan')}
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
              {t('Username', 'Nama Pengguna')}
            </label>
            <div className="relative">
              <AtSign className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-all lowercase"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4">
            <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border-2 border-indigo-100 px-4 py-2 rounded-xl uppercase tracking-wider inline-block">
              {t('Joined March 2026', 'Bergabung Maret 2026')}
            </span>
            <button
              onClick={handleSaveChanges}
              disabled={!hasChanges || isSaving}
              className={`px-6 py-3 rounded-2xl font-extrabold text-sm transition-all w-full sm:w-auto ${hasChanges && !isSaving ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:-translate-y-0.5' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {isSaving ? t('Saving...', 'Menyimpan...') : t('Save Changes', 'Simpan Perubahan')}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-slate-700 mb-5 flex items-center gap-2.5 px-1">
          <User className="w-6 h-6 text-slate-400" /> {t('Statistics', 'Statistik')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 border-2 border-orange-200 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-700 leading-none">{user.streakDays}</h3>
              <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wide">{t('Day streak', 'Hari streak')}</p>
            </div>
          </div>

          <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 border-2 border-sky-200 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-sky-500 fill-sky-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-700 leading-none">{user.totalXp}</h3>
              <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wide">{t('Total XP', 'Total XP')}</p>
            </div>
          </div>

          <Link href="/leaderboard" className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border-2 border-amber-200 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-extrabold text-slate-700 leading-none truncate">
                #{user.rank}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wide truncate">{t('Current rank', 'Peringkat saat ini')}</p>
            </div>
          </Link>

          <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-200 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-700 leading-none">{user.hearts}</h3>
              <p className="text-xs font-bold text-slate-400 mt-1.5 uppercase tracking-wide">{t('Hearts left', 'Nyawa tersisa')}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold text-slate-700 mb-5 flex items-center gap-2.5 px-1">
          <Medal className="w-6 h-6 text-slate-400" /> {t('Achievements', 'Pencapaian')}
        </h2>
        <div className="space-y-4">
          <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-5 flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-orange-100 border-2 border-orange-200 flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="w-8 h-8 text-orange-500 fill-orange-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-extrabold text-slate-700 text-lg">{t('Wildfire', 'Api Liar')}</h3>
                <span className="text-sm font-extrabold text-slate-400">6/7</span>
              </div>
              <p className="text-sm font-semibold text-slate-500 mb-4">{t('Reach a 7 day streak', 'Capai streak 7 hari')}</p>
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div className="h-full w-[85%] bg-amber-400 rounded-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 w-full h-1/3 rounded-t-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-5 flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-sky-100 border-2 border-sky-200 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-8 h-8 text-sky-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-extrabold text-slate-700 text-lg">{t('Flawless Victory', 'Kemenangan Sempurna')}</h3>
                <span className="text-sm font-extrabold text-slate-400">2/5</span>
              </div>
              <p className="text-sm font-semibold text-slate-500 mb-4">{t('Perfect score in 5 modules', 'Skor sempurna di 5 modul')}</p>
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div className="h-full w-[40%] bg-sky-400 rounded-full relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 w-full h-1/3 rounded-t-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border-2 border-b-4 border-slate-200 rounded-2xl p-5 flex items-center gap-5 opacity-75 grayscale-[0.3]">
            <div className="w-16 h-16 rounded-3xl bg-slate-200 border-2 border-slate-300 flex items-center justify-center shrink-0">
              <Trophy className="w-8 h-8 text-slate-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="font-extrabold text-slate-500 text-lg">{t('Top Contender', 'Penantang Teratas')}</h3>
                <span className="text-sm font-extrabold text-slate-400">0/1</span>
              </div>
              <p className="text-sm font-semibold text-slate-400 mb-4">{t('Reach Rank #1 on the leaderboard', 'Raih Peringkat #1 di papan peringkat')}</p>
              <div className="h-3.5 w-full bg-slate-200 rounded-full overflow-hidden border border-slate-300/50">
                <div className="h-full w-0 bg-amber-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {avatarModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-800">{t('Choose an Avatar', 'Pilih Avatar')}</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {t('Pick a preset or upload your own.', 'Pilih preset atau unggah fotomu.')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setAvatarUrl(url)
                    setAvatarModalOpen(false)
                    showToast(t('Avatar updated!', 'Avatar diperbarui!'), 'success')
                  }}
                  className="aspect-square bg-slate-50 rounded-2xl border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 transition p-2"
                >
                  <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">{t('OR', 'ATAU')}</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-extrabold text-slate-700 hover:bg-slate-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div> : <Upload className="w-5 h-5" />}
                {isUploading ? loadingText : t('Upload Custom Photo', 'Unggah Foto Sendiri')}
              </button>
            </div>
            <button onClick={() => setAvatarModalOpen(false)} className="w-full py-3 rounded-2xl font-extrabold text-xs text-slate-500 hover:text-slate-700 transition">
              {t('Cancel', 'Batal')}
            </button>
          </div>
        </div>
      )}

      <div
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out transform ${toast.visible
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-8 opacity-0 scale-95 pointer-events-none'
          }`}
      >
        <div
          className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border-2 ${toast.type === 'success'
              ? 'profile-toast-success'
              : toast.type === 'warning'
                ? 'profile-toast-warning'
                : 'profile-toast-error'
            }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : (
            <AlertCircle className="w-6 h-6" />
          )}

          <span className="font-extrabold text-sm">
            {toast.message}
          </span>
        </div>
      </div>
    </div>
  )
}