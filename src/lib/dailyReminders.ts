/**
 * Web Push subscription helpers for Questly's daily streak reminders.
 */

const REMINDERS_KEY = 'questly_daily_reminders'

type ReminderSettingsResponse = {
  publicKey: string
  enabled: boolean
}

function isReminderSettingsResponse(value: unknown): value is ReminderSettingsResponse {
  return typeof value === 'object'
    && value !== null
    && 'publicKey' in value
    && typeof value.publicKey === 'string'
    && 'enabled' in value
    && typeof value.enabled === 'boolean'
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const result: unknown = await response.json()
    if (typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string') {
      return result.error
    }
  } catch (error) {
    console.error('Could not read the daily reminder API response.', error)
  }
  return fallback
}

async function getReminderSettings(): Promise<ReminderSettingsResponse> {
  const response = await fetch('/api/push-subscription', { cache: 'no-store' })
  if (!response.ok) throw new Error(await readError(response, 'Could not load daily reminder settings.'))
  const result: unknown = await response.json()
  if (!isReminderSettingsResponse(result)) {
    throw new Error('The server returned invalid daily reminder settings.')
  }
  return result
}

function decodeApplicationServerKey(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }
  return bytes.buffer
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator
    && 'PushManager' in window
}

export function areRemindersEnabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(REMINDERS_KEY) === 'true'
  } catch (error) {
    console.warn('Could not read the local daily reminder preference.', error)
    return false
  }
}

export function setRemindersEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REMINDERS_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('questly_reminders_changed', { detail: { enabled } }))
  } catch (error) {
    console.warn('Could not save the local daily reminder preference.', error)
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') setRemindersEnabled(false)
    return permission
  } catch (error) {
    console.error('Could not request notification permission.', error)
    return 'denied'
  }
}

export async function loadDailyReminderStatus(): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false
  const settings = await getReminderSettings()
  if (!settings.enabled) return false

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  const enabled = Boolean(subscription) && areRemindersEnabled()
  if (!enabled) setRemindersEnabled(false)
  return enabled
}

export async function enableDailyReminders(): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    throw new Error('Allow browser notifications to enable daily reminders.')
  }

  const { publicKey } = await getReminderSettings()
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const existingSubscription = await registration.pushManager.getSubscription()
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeApplicationServerKey(publicKey),
  })

  const response = await fetch('/api/push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })
  if (!response.ok) {
    if (!existingSubscription) await subscription.unsubscribe()
    throw new Error(await readError(response, 'Could not enable daily reminders.'))
  }
  setRemindersEnabled(true)
}

export async function disableDailyReminders(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  const response = await fetch('/api/push-subscription', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription?.endpoint ?? null }),
  })
  if (!response.ok) throw new Error(await readError(response, 'Could not disable daily reminders.'))
  if (subscription) await subscription.unsubscribe()
  setRemindersEnabled(false)
}

export async function sendWelcomeReminderNotification(isIndonesian = false): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(
      isIndonesian ? '🔥 Pengingat Harian Aktif!' : '🔥 Daily Reminders Active!',
      {
        body: isIndonesian
          ? 'Questly akan mengingatkanmu pukul 23.00 WIB jika kamu belum belajar hari ini.'
          : "Questly will remind you at 11 PM Jakarta if you haven't studied today.",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      },
    )
  } catch (error) {
    console.error('Could not show the daily reminder confirmation.', error)
  }
}
