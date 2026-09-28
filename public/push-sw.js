/**
 * Handlers de Web Push do Service Worker (importado via workbox.importScripts).
 *
 * Payload enviado pelo back-end (fzlbpms /api/tasktoday):
 * { "title", "body", "tag", "data": { "type": "task-alarm" | "test", "taskId", "deadline" } }
 */

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Task Today App'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      tag: payload.tag,
      data: payload.data || {},
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-96.png'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => c.url.startsWith(self.registration.scope))
      if (client) return client.focus()
      return self.clients.openWindow(self.registration.scope)
    })
  )
})
