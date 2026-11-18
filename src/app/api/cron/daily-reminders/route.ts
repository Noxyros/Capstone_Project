import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { jakartaDateKey } from '@/src/lib/dailyQuests'
import { prisma } from '@/src/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 60

type PushTarget = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  language: string
}

function isAuthorized(request: Request, secret: string): boolean {
  const authorization = request.headers.get('authorization') ?? ''
  const provided = Buffer.from(authorization)
  const expected = Buffer.from(`Bearer ${secret}`)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

function jakartaHour(date: Date): number {
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(date)
  return Number(hour)
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    console.error('Daily reminder cron is missing CRON_SECRET.')
    return NextResponse.json({ error: 'Daily reminder scheduling is not configured.' }, { status: 503 })
  }
  if (!isAuthorized(request, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()
  if (!publicKey || !privateKey || !subject) {
    console.error('Daily reminder push credentials are not configured.')
    return NextResponse.json({ error: 'Daily reminder push is not configured.' }, { status: 503 })
  }

  const now = new Date()
  if (jakartaHour(now) !== 23) {
    return NextResponse.json({ skipped: 'outside-reminder-hour' })
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
  } catch (error) {
    console.error('Daily reminder push credentials are invalid.', error)
    return NextResponse.json({ error: 'Daily reminder push credentials are invalid.' }, { status: 503 })
  }
  const today = jakartaDateKey(now)
  let targets: PushTarget[]
  try {
    const users = await prisma.user.findMany({
      where: {
        dailyReminders: true,
        activityDays: { none: { date: today } },
        webPushSubscriptions: { some: {} },
      },
      select: {
        language: true,
        webPushSubscriptions: {
          select: { id: true, endpoint: true, p256dh: true, auth: true },
        },
      },
    })
    targets = users.flatMap((user) => user.webPushSubscriptions.map((subscription) => ({
      ...subscription,
      language: user.language,
    })))
  } catch (error) {
    console.error('Failed to find users who need a daily reminder.', error)
    return NextResponse.json({ error: 'Could not load daily reminder recipients.' }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let removed = 0
  for (let index = 0; index < targets.length; index += 20) {
    const batch = targets.slice(index, index + 20)
    const results = await Promise.all(batch.map(async (target) => {
      const isIndonesian = target.language === 'id'
      try {
        await webpush.sendNotification({
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        }, JSON.stringify({
          title: isIndonesian ? '🔥 Jaga streak belajarmu!' : '🔥 Protect your learning streak!',
          body: isIndonesian
            ? 'Selesaikan satu materi atau Tantangan Bank Soal sebelum hari berakhir.'
            : 'Complete a lesson or Question Bank challenge before the day resets.',
          url: '/',
          tag: `questly-daily-reminder-${today}`,
        }), { TTL: 3_600 })
        return 'sent' as const
      } catch (error) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
          ? error.statusCode
          : undefined
        if (statusCode === 404 || statusCode === 410) {
          try {
            await prisma.webPushSubscription.delete({ where: { id: target.id } })
            return 'removed' as const
          } catch (deleteError) {
            console.error('Could not remove an expired web push subscription.', deleteError)
          }
        } else {
          console.error('Failed to send a daily reminder.', { statusCode })
        }
        return 'failed' as const
      }
    }))
    sent += results.filter((result) => result === 'sent').length
    failed += results.filter((result) => result === 'failed').length
    removed += results.filter((result) => result === 'removed').length
  }

  return NextResponse.json({ date: today, sent, failed, removed }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
