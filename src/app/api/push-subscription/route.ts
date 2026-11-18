import { NextResponse } from 'next/server'
import { authenticateAppUser } from '@/src/lib/auth/server'
import { prisma } from '@/src/lib/prisma'

const PUSH_SERVICE_HOSTS = new Set([
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPushSubscription(value: unknown): value is {
  endpoint: string
  keys: { p256dh: string; auth: string }
} {
  if (!isRecord(value) || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) return false
  if (!isRecord(value.keys)
    || typeof value.keys.p256dh !== 'string'
    || !/^[A-Za-z0-9_-]{20,200}$/.test(value.keys.p256dh)
    || typeof value.keys.auth !== 'string'
    || !/^[A-Za-z0-9_-]{10,100}$/.test(value.keys.auth)) {
    return false
  }

  try {
    const endpoint = new URL(value.endpoint)
    return endpoint.protocol === 'https:'
      && !endpoint.username
      && !endpoint.password
      && PUSH_SERVICE_HOSTS.has(endpoint.hostname)
  } catch {
    return false
  }
}

export async function GET() {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  if (!publicKey) {
    return NextResponse.json({ error: 'Push notifications are not configured.' }, { status: 503 })
  }

  const user = await prisma.user.findUnique({
    where: { id: authentication.appUser.id },
    select: { dailyReminders: true },
  })
  if (!user) return NextResponse.json({ error: 'Your account profile could not be found.' }, { status: 404 })

  return NextResponse.json({ publicKey, enabled: user.dailyReminders }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (!isRecord(body) || !isPushSubscription(body.subscription)) {
    return NextResponse.json({ error: 'Push subscription data is invalid.' }, { status: 400 })
  }

  try {
    await prisma.$transaction([
      prisma.webPushSubscription.upsert({
        where: { endpoint: body.subscription.endpoint },
        create: {
          userId: authentication.appUser.id,
          endpoint: body.subscription.endpoint,
          p256dh: body.subscription.keys.p256dh,
          auth: body.subscription.keys.auth,
        },
        update: {
          userId: authentication.appUser.id,
          p256dh: body.subscription.keys.p256dh,
          auth: body.subscription.keys.auth,
        },
      }),
      prisma.user.update({
        where: { id: authentication.appUser.id },
        data: { dailyReminders: true },
      }),
    ])
    return NextResponse.json({ enabled: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to save the web push subscription.', error)
    return NextResponse.json({ error: 'Could not enable daily reminders.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const authentication = await authenticateAppUser()
  if (!authentication.appUser) {
    return NextResponse.json({ error: authentication.error }, { status: authentication.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }
  if (!isRecord(body) || (body.endpoint !== null && typeof body.endpoint !== 'string')) {
    return NextResponse.json({ error: 'Push subscription data is invalid.' }, { status: 400 })
  }

  try {
    await prisma.$transaction([
      prisma.webPushSubscription.deleteMany({
        where: {
          userId: authentication.appUser.id,
          ...(body.endpoint ? { endpoint: body.endpoint } : {}),
        },
      }),
      prisma.user.update({
        where: { id: authentication.appUser.id },
        data: { dailyReminders: false },
      }),
    ])
    return NextResponse.json({ enabled: false }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to disable daily reminders.', error)
    return NextResponse.json({ error: 'Could not disable daily reminders.' }, { status: 500 })
  }
}
