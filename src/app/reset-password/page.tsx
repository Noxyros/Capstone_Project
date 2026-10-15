'use client'

import React, { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react'
import { createClient, isSupabaseBrowserConfigured } from '@/src/lib/supabase/client'
import { useLanguage } from '@/src/context/LanguageContext'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useLanguage()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    async function checkSession() {
      if (!isSupabaseBrowserConfigured()) {
        setIsCheckingSession(false)
        return
      }
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          // If no recovery session, check URL hash / query parameters
          const hash = window.location.hash
          if (!hash.includes('access_token') && !window.location.search.includes('code')) {
            setError(t(
              'Your password reset session has expired or is invalid. Please request a new link.',
              'Sesi atur ulang kata sandi telah kedaluwarsa atau tidak valid. Silakan minta tautan baru.'
            ))
          }
        }
      } catch {} finally {
        setIsCheckingSession(false)
      }
    }
    void checkSession()
  }, [t])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(t('Password must be at least 8 characters.', 'Kata sandi minimal 8 karakter.'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match. Please re-enter.', 'Kata sandi tidak cocok. Silakan masukkan ulang.'))
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        throw updateError
      }

      setIsSuccess(true)
      setTimeout(() => {
        router.replace('/')
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not update password.', 'Tidak dapat memperbarui kata sandi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-between overflow-x-hidden bg-slate-50 font-sans text-slate-800 antialiased">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 font-black text-white shadow-md">
            Q
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800">QUESTLY</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6 sm:pb-12">
        <section className="w-full max-w-[440px] rounded-[30px] border border-white/90 bg-white/90 p-6 shadow-[0_24px_80px_-28px_rgba(30,41,59,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:p-9">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-[28px] font-black leading-tight tracking-tight text-slate-900 sm:text-[32px]">
              {t('New Password', 'Kata Sandi Baru')}
            </h1>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              {t('Choose a strong password with at least 8 characters.', 'Pilih kata sandi yang kuat minimal 8 karakter.')}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">
                {t('Password Updated!', 'Kata Sandi Diperbarui!')}
              </h2>
              <p className="text-sm font-medium text-slate-600">
                {t(
                  'Your password has been changed successfully. Redirecting you to Questly…',
                  'Kata sandimu berhasil diperbarui. Mengalihkan ke Questly…'
                )}
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-3.5 font-extrabold text-white transition hover:bg-indigo-700"
              >
                {t('Continue to Questly', 'Lanjut ke Questly')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600">
                  {t('New password', 'Kata sandi baru')}
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 pr-12 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                    placeholder={t('At least 8 characters', 'Minimal 8 karakter')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center rounded-xl text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600">
                  {t('Confirm password', 'Konfirmasi kata sandi')}
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder={t('Repeat your new password', 'Ulangi kata sandi baru')}
                />
              </label>

              {error && (
                <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isCheckingSession}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? t('Updating password…', 'Memperbarui kata sandi…') : t('Save new password', 'Simpan kata sandi baru')}
                {!isSubmitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs font-extrabold text-slate-500 hover:text-indigo-600 transition"
                >
                  {t('Back to Login', 'Kembali ke Halaman Masuk')}
                </Link>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  )
}

