/* KvizToGo Web Push service worker */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'KvizToGo';
  const options = {
    body: data.body || 'Današnjih 30 pitanja te čeka!',
    icon: data.icon || '/images/KvizToGo-online-kviz-pitanja.png',
    badge: data.badge || '/images/KvizToGo-online-kviz-pitanja.png',
    tag: data.tag || 'kviztogo-daily30',
    renotify: false,
    data: { url: data.url || '/online-kviz.html?daily30=1' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/online-kviz.html?daily30=1', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) { await client.focus(); if ('navigate' in client) await client.navigate(target); return; }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
