/* KvizToGo Web Push service worker */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }

  const base = new URL('./', self.registration.scope);
  const icon = new URL('Images/KvizToGo-online-kviz-pitanja.png', base).href;
  const target = new URL('online-kviz.html?daily30=1', base).href;

  const title = data.title || 'KvizToGo';
  const options = {
    body: data.body || 'Današnjih 30 pitanja te čeka!',
    icon: data.icon || icon,
    badge: data.badge || icon,
    tag: data.tag || 'kviztogo-daily30',
    renotify: false,
    requireInteraction: false,
    data: { url: data.url ? new URL(data.url, base).href : target }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const base = new URL('./', self.registration.scope);
  const target = event.notification.data?.url || new URL('online-kviz.html?daily30=1', base).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(target);
  })());
});
