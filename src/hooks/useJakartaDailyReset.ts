'use client'

import { useEffect, useState } from 'react'
import { jakartaDateKey, secondsUntilJakartaDailyReset } from '@/src/lib/dailyQuests'

export function useJakartaDailyReset() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  return {
    dateKey: jakartaDateKey(now),
    secondsRemaining: secondsUntilJakartaDailyReset(now),
  }
}
