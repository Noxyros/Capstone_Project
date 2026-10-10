'use client'

import { Clock } from 'lucide-react'
import { useLanguage } from '@/src/context/LanguageContext'

export default function DailyResetCountdown({ secondsRemaining }: { secondsRemaining: number }) {
  const { t } = useLanguage()
  const hours = Math.floor(secondsRemaining / 3600)
  const minutes = Math.floor((secondsRemaining % 3600) / 60)
  const seconds = secondsRemaining % 60
  const countdown = [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')

  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <Clock className="h-4 w-4 shrink-0" />
      <span>{t(`Resets in ${countdown}`, `Reset dalam ${countdown}`)}</span>
    </span>
  )
}
