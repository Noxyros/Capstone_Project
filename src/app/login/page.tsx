'use client'

import React, { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useAuth } from '@/src/context/AuthContext'
import { useLanguage } from '@/src/context/LanguageContext'
import { createClient, isSupabaseBrowserConfigured } from '@/src/lib/supabase/client'

type FormMode = 'sign_in' | 'sign_up'
type AuthLanguage = 'en' | 'id'

function getAuthErrorMessage(
  error: { code?: string; message: string },
  mode: FormMode,
  t: (english: string, indonesian: string) => string,
): string {
  if (error.code === 'email_address_invalid') {
    return t(
      'Supabase rejected this email address. Check the address and your project’s Authentication email settings.',
      'Supabase menolak alamat email ini. Periksa alamat dan pengaturan email Authentication di project.'
    )
  }

  if (
    error.code === 'over_email_send_rate_limit'
    || error.code === 'email_rate_limit_exceeded'
    || error.message.toLowerCase().includes('rate limit')
  ) {
    return t(
      'Supabase has temporarily limited authentication emails or attempts for this project. Stop retrying for now, wait for its limit to reset, or configure custom SMTP in Supabase Auth.',
      'Supabase membatasi sementara email atau percobaan autentikasi untuk project ini. Hentikan percobaan dulu, tunggu hingga batas direset, atau atur SMTP khusus di Supabase Auth.'
    )
  }

  if (mode === 'sign_in' && error.code === 'invalid_credentials') {
    return t(
      'Email or password is incorrect. If you have not created a Supabase Auth account yet, choose Sign up first.',
      'Email atau kata sandi salah. Jika belum memiliki akun Supabase Auth, pilih Daftar terlebih dahulu.'
    )
  }

  return error.message
}

export default function LoginPage() {
  const { state: authState, error: authError } = useAuth()
  const { language: appLanguage } = useLanguage()
  const router = useRouter()
  const [language, setLanguage] = useState<AuthLanguage>('en')
  const [mode, setMode] = useState<FormMode>('sign_in')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
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
        const normalizedUsername = username.trim().toLowerCase()
        if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
          setError(t(
            'Choose a username with 3–24 characters: lowercase letters, numbers, and underscores.',
            'Pilih nama pengguna 3–24 karakter: huruf kecil, angka, dan garis bawah.'
          ))
          return
        }

        const availabilityResponse = await fetch('/api/auth/username-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: normalizedUsername }),
        })
        const availability: unknown = await availabilityResponse.json()
        if (!availabilityResponse.ok) {
          const message = typeof availability === 'object'
            && availability !== null
            && 'error' in availability
            && typeof availability.error === 'string'
            ? availability.error
            : t('Could not check username availability.', 'Tidak dapat memeriksa ketersediaan nama pengguna.')
          setError(message)
          return
        }
        if (
          typeof availability !== 'object'
          || availability === null
          || !('available' in availability)
          || typeof availability.available !== 'boolean'
        ) {
          setError(t('The server returned an invalid username check.', 'Server mengirim pemeriksaan nama pengguna yang tidak valid.'))
          return
        }
        if (!availability.available) {
          setError(t('That username is already taken. Please choose another.', 'Nama pengguna itu sudah dipakai. Silakan pilih yang lain.'))
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            data: { handle: normalizedUsername },
          },
        })
        if (signUpError) {
          setError(getAuthErrorMessage(signUpError, mode, t))
          return
        }
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

      const identifier = email.trim()
      if (identifier.includes('@')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password,
        })
        if (signInError) {
          setError(getAuthErrorMessage(signInError, mode, t))
          return
        }
      } else {
        const response = await fetch('/api/auth/username-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier.toLowerCase(), password }),
        })
        const result: unknown = await response.json()
        if (!response.ok) {
          const message = typeof result === 'object'
            && result !== null
            && 'error' in result
            && typeof result.error === 'string'
            ? result.error
            : t('Username or password is incorrect.', 'Nama pengguna atau kata sandi salah.')
          setError(message)
          return
        }
        if (
          typeof result !== 'object'
          || result === null
          || !('access_token' in result)
          || typeof result.access_token !== 'string'
          || !('refresh_token' in result)
          || typeof result.refresh_token !== 'string'
        ) {
          setError(t('Sign-in returned an invalid session. Please try again.', 'Login mengembalikan sesi yang tidak valid. Silakan coba lagi.'))
          return
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
        if (sessionError) {
          setError(getAuthErrorMessage(sessionError, mode, t))
          return
        }
      }
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
    <div className="auth-page relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#f4f7f6] text-slate-800">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="auth-indigo-glow absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="auth-emerald-glow absolute -bottom-48 -right-32 h-[34rem] w-[34rem] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="auth-dot-pattern absolute inset-0 opacity-[0.24] [background-image:radial-gradient(#94a3b8_0.7px,transparent_0.7px)] [background-size:22px_22px]" />
      </div>

      <header className="relative z-10 flex items-center justify-end px-5 py-4 sm:px-9 sm:py-5">
        <div className="auth-language-control inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/80 p-1 shadow-sm backdrop-blur">
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
              <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600">
                {mode === 'sign_in' ? t('Username or email', 'Nama pengguna atau email') : t('Email address', 'Alamat email')}
              </span>
              <input
                type={mode === 'sign_in' ? 'text' : 'email'}
                autoComplete={mode === 'sign_in' ? 'username' : 'email'}
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                placeholder={mode === 'sign_in' ? t('Username or email', 'Nama pengguna atau email') : t('Email address', 'Alamat email')}
              />
            </label>

            {mode === 'sign_up' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600">{t('Username', 'Nama pengguna')}</span>
                <input
                  type="text"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9_]{3,24}"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  placeholder={t('3–24 letters, numbers, or underscores', '3–24 huruf, angka, atau garis bawah')}
                />
              </label>
            )}

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
                setEmail('')
                setUsername('')
                setPassword('')
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
