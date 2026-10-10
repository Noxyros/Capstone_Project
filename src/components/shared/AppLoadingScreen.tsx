'use client'

import { useLanguage } from '@/src/context/LanguageContext'

export default function AppLoadingScreen({
  message,
  error,
  onRetry,
}: {
  message?: string
  error?: string
  onRetry?: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className="app-boot-screen app-screen-enter" role="status" aria-live="polite">
      <div className="app-boot-content">
        <div className="app-boot-logo" aria-hidden="true">Q</div>
        <span className="app-boot-spinner" aria-hidden="true" />
        <p>{message ?? t('Getting your learning space ready…', 'Menyiapkan ruang belajarmu…')}</p>
        {error && <p role="alert" className="max-w-md text-sm text-rose-600">{error}</p>}
        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-indigo-700"
          >
            {t('Try again', 'Coba lagi')}
          </button>
        )}
      </div>
    </div>
  )
}
