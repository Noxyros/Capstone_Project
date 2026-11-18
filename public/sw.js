self.addEventListener('push', (event) => {
  let payload = {
    title: 'Questly daily reminder',
    body: 'Complete a lesson or Question Bank challenge before the day resets.',
    url: '/',
  }

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.tag,
    renotify: false,
    data: { url: payload.url },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const requestedUrl = new URL(event.notification.data?.url || '/', self.location.origin)
  const targetUrl = requestedUrl.origin === self.location.origin
    ? requestedUrl.href
    : self.location.origin

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => new URL(client.url).origin === self.location.origin)
    if (existingClient) return existingClient.focus()
    return self.clients.openWindow(targetUrl)
  }))
})
