/**
 * Web Notification & Streak Daily Reminder manager for Questly.
 */

const REMINDERS_KEY = 'questly_daily_reminders'
const LAST_REMINDER_DATE_KEY = 'questly_last_reminder_date'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function areRemindersEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(REMINDERS_KEY) === 'true'
  } catch {
    return false
  }
}

export function setRemindersEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REMINDERS_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('questly_reminders_changed', { detail: { enabled } }))
  } catch {}
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setRemindersEnabled(true)
    } else {
      setRemindersEnabled(false)
    }
    return permission
  } catch {
    return 'denied'
  }
}

export function sendWelcomeReminderNotification(isIndonesian = false): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  try {
    const title = isIndonesian
      ? '🔥 Pengingat Harian Aktif!'
      : '🔥 Daily Reminders Active!'
    const body = isIndonesian
      ? 'Questly akan mengingatkanmu setiap hari agar streak belajarmu tetap menyala.'
      : "Questly will remind you every day so your learning streak stays burning."

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })
  } catch {
    // Some mobile browsers restrict non-service-worker Notification creation
  }
}

export function checkAndSendDailyReminder(
  options: {
    streak: number
    hasStudiedToday: boolean
    isIndonesian?: boolean
    force?: boolean
  }
): boolean {
  if (!isNotificationSupported() || !areRemindersEnabled() || Notification.permission !== 'granted') {
    return false
  }

  const { streak, hasStudiedToday, isIndonesian = false, force = false } = options

  // If student already studied today, no reminder needed unless forced
  if (hasStudiedToday && !force) {
    return false
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const lastSent = localStorage.getItem(LAST_REMINDER_DATE_KEY)
  if (lastSent === todayStr && !force) {
    return false
  }

  try {
    const title = streak > 0
      ? (isIndonesian
          ? `🔥 Jaga ${streak} Hari Streak-mu!`
          : `🔥 Protect your ${streak}-day streak!`)
      : (isIndonesian
          ? '⚡ Waktunya Belajar di Questly!'
          : "⚡ Time for today's Questly practice!")

    const body = isIndonesian
      ? 'Selesaikan satu materi atau kuis singkat hari ini untuk menjaga api belajarmu!'
      : 'Complete one short lesson or quiz today to keep your progress burning!'

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    })

    localStorage.setItem(LAST_REMINDER_DATE_KEY, todayStr)
    return true
  } catch {
    return false
  }
}

