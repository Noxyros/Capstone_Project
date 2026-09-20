'use client'

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '@/src/context/LanguageContext'

export default function LoginPage() {
  const { t } = useLanguage()

  return (
    <div className="max-w-md mx-auto mt-16 bg-white border-2 border-slate-200 rounded-3xl p-8 text-center">
      <h1 className="text-2xl font-extrabold text-slate-700">{t('You’re logged out', 'Kamu telah keluar')}</h1>
      <p className="text-sm font-semibold text-slate-500 mt-2 leading-relaxed">
        {t(
          'Prototype sign-in isn’t connected yet. Jump back in anytime.',
          'Otentikasi prototipe belum terhubung. Kamu dapat kembali belajar kapan saja.'
        )}
      </p>
      <Link
        href="/"
        className="inline-block mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold px-6 py-3 rounded-2xl transition shadow-sm"
      >
        {t('Back to Learn', 'Kembali ke Belajar')}
      </Link>
    </div>
  )
}