/* Rakky Ride push worker. No page, API response or credential caching. */
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
function safeDestination(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/ride/notifications', self.location.origin);
    if (url.origin !== self.location.origin || !(/^(?:\/ride(?:\/(?:wallet|help|notifications|trips\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?|\/drive(?:\/(?:earnings|payouts|application|account|help|notifications|trips\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?)$/i.test(url.pathname))) return self.location.origin + '/ride/notifications';
    url.search = ''; url.hash = ''; return url.href;
  } catch { return self.location.origin + '/ride/notifications'; }
}
self.addEventListener('push', event => {
  let data = {};
  try { const raw = event.data?.text() || '{}'; if (raw.length <= 4096) data = JSON.parse(raw); } catch { /* Generic notification below. */ }
  const id = typeof data?.notificationId === 'string' && /^[0-9a-f-]{36}$/i.test(data.notificationId) ? data.notificationId : null;
  event.waitUntil(self.registration.showNotification('Rakky Ride', {
    body: 'You have a new Rakky Ride update.', icon: '/brand/rakky-ride-logo.png', badge: '/brand/rakky-ride-logo.png',
    tag: id ? 'rakky-' + id : 'rakky-update', silent: data?.silent === true,
    data: { url: safeDestination(data?.url), notificationId: id }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = safeDestination(event.notification.data?.url), id = event.notification.data?.notificationId;
  event.waitUntil((async () => {
    if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) {
      await fetch('/api/rider/notifications/' + encodeURIComponent(id) + '/opened', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin' }).catch(() => undefined);
    }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => { try { const candidate = new URL(client.url); return candidate.origin === self.location.origin && (candidate.pathname === '/' || candidate.pathname === '/ride' || candidate.pathname.startsWith('/ride/') || candidate.pathname === '/drive' || candidate.pathname.startsWith('/drive/')); } catch { return false; } });
    if (existing) { await existing.navigate(url); await existing.focus(); }
    else await self.clients.openWindow(url);
  })());
});
