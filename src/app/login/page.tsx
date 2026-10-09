'use client'

import React, { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'
import { useLanguage } from '@/src/context/LanguageContext'
import { createClient, isSupabaseBrowserConfigured } from '@/src/lib/supabase/client'

type FormMode = 'sign_in' | 'sign_up'
type AuthLanguage = 'en' | 'id'

export default function LoginPage() {
  const { state: authState, error: authError } = useAuth()
  const { language: appLanguage } = useLanguage()
  const router = useRouter()
  const [language, setLanguage] = useState<AuthLanguage>('en')
  const [mode, setMode] = useState<FormMode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const t = (english: string, indonesian: string) => language === 'en' ? english : indonesian
  const getNextPath = () => {
    const requestedPath = new URLSearchParams(window.location.search).get('next') ?? '/'
    return requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : '/'
  }

  useEffect(() => {
    document.documentElement.lang = language
    return () => {
      document.documentElement.lang = appLanguage
    }
  }, [appLanguage, language])

  useEffect(() => {
    if (authState === 'signed_in') router.replace(getNextPath())
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'confirmation') {
      setError('The email confirmation link could not be verified. Please sign in or request a new link.')
    } else if (params.get('error') === 'configuration') {
      setError('Sign-in could not be completed because authentication is misconfigured.')
    }
  }, [authState, router])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!isSupabaseBrowserConfigured()) {
      setError(t(
        'Supabase sign-in is not configured. Add the public project URL and publishable key to .env.local, then restart the app.',
        'Login Supabase belum dikonfigurasi. Tambahkan URL project dan publishable key ke .env.local, lalu mulai ulang aplikasi.'
      ))
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const nextPath = getNextPath()
      if (mode === 'sign_up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice(t(
            'Check your email to confirm your account. Your account will start as a student.',
            'Periksa email untuk mengonfirmasi akun. Akun baru akan dimulai sebagai siswa.'
          ))
          setMode('sign_in')
          setPassword('')
          return
        }
        router.replace(nextPath)
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError
      router.replace(nextPath)
    } catch (submitError) {
      console.error(`Supabase ${mode === 'sign_up' ? 'sign-up' : 'sign-in'} failed.`, submitError)
      const providerMessage = submitError instanceof Error ? submitError.message : ''
      setError(providerMessage || t('Authentication failed. Please try again.', 'Autentikasi gagal. Silakan coba lagi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const configurationError = authState === 'configuration_error' ? authError : ''

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#f4f7f6] text-slate-800">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.24] [background-image:radial-gradient(#94a3b8_0.7px,transparent_0.7px)] [background-size:22px_22px]" />
      </div>

      <header className="relative z-10 flex items-center justify-end px-5 py-4 sm:px-9 sm:py-5">
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/80 p-1 shadow-sm backdrop-blur">
          {(['en', 'id'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLanguage(option)}
              aria-pressed={language === option}
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${
                language === option ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6 sm:pb-12">
        <section className="w-full max-w-[440px] rounded-[30px] border border-white/90 bg-white/90 p-6 shadow-[0_24px_80px_-28px_rgba(30,41,59,0.28)] ring-1 ring-slate-200/70 backdrop-blur-xl sm:p-9">
          <div className="mb-7 text-center">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-indigo-600">
              {mode === 'sign_in' ? t('Your learning journey', 'Perjalanan belajarmu') : t('Start learning today', 'Mulai belajar hari ini')}
            </p>
            <h1 className="text-[28px] font-black leading-tight tracking-tight text-slate-900 sm:text-[32px]">
              {mode === 'sign_in' ? t('Log in', 'Masuk') : t('Sign up', 'Daftar')}
            </h1>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              {mode === 'sign_in' ? t('Sign in to continue.', 'Masuk untuk melanjutkan.') : t('Create your student account.', 'Buat akun siswa.')}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600">{t('Email address', 'Alamat email')}</span>
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                placeholder={t('Email address', 'Alamat email')}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600">{t('Password', 'Kata sandi')}</span>
              <input
                type="password"
                autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
                required
                minLength={8}
                maxLength={72}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                placeholder={t('At least 8 characters', 'Minimal 8 karakter')}
              />
            </label>

            {(error || configurationError) && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">
                {error || configurationError}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">
                {notice}
              </p>
            )}
            {authState === 'profile_error' && authError && (
              <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-bold text-amber-800">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || authState === 'loading'}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting
                ? t('Please wait…', 'Tunggu…')
                : mode === 'sign_in'
                  ? t('Sign in to Questly', 'Masuk ke Questly')
                  : t('Create student account', 'Buat akun siswa')}
              {!isSubmitting && <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="my-5 h-px bg-slate-100" />
          <p className="text-center text-sm font-medium text-slate-500">
            {mode === 'sign_in' ? t('New to Questly?', 'Baru di Questly?') : t('Already have an account?', 'Sudah punya akun?')}{' '}
            <button
              type="button"
              onClick={() => {
                setMode((current) => current === 'sign_in' ? 'sign_up' : 'sign_in')
                setError('')
                setNotice('')
              }}
              className="font-extrabold text-indigo-700 underline decoration-indigo-200 decoration-2 underline-offset-4 transition hover:decoration-indigo-600"
            >
              {mode === 'sign_in' ? t('Create an account', 'Buat akun') : t('Sign in', 'Masuk')}
            </button>
          </p>

        </section>
      </main>
    </div>
  )
}
