'use client'

import { useLanguage } from '@/src/context/LanguageContext'

export default function AppLoadingScreen({ message }: { message?: string }) {
  const { t } = useLanguage()

  return (
    <div className="app-boot-screen app-screen-enter" role="status" aria-live="polite">
      <div className="app-boot-content">
        <div className="app-boot-logo" aria-hidden="true">Q</div>
        <span className="app-boot-spinner" aria-hidden="true" />
        <p>{message ?? t('Getting your learning space ready…', 'Menyiapkan ruang belajarmu…')}</p>
      </div>
    </div>
  )
}
