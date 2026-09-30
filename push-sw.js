/* KvizToGo Web Push service worker */
function productionUrl(value, fallback = 'online-kviz.html?daily30=1') {
  try {
    const url = new URL(value || fallback, 'https://kviztogo.com/');
    if (url.hostname.endsWith('.github.io')) {
      url.protocol = 'https:';
      url.hostname = 'kviztogo.com';
      url.port = '';
    }
    return url.href;
  } catch (_) {
    return new URL(fallback, 'https://kviztogo.com/').href;
  }
}

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }

  const base = new URL('https://kviztogo.com/');
  const icon = new URL('Images/KvizToGo-online-kviz-pitanja.png', base).href;
  const target = productionUrl();

  const title = data.title || 'KvizToGo';
  const options = {
    body: data.body || 'Današnjih 30 pitanja te čeka!',
    icon: data.icon || icon,
    badge: data.badge || icon,
    tag: data.tag || 'kviztogo-daily30',
    renotify: false,
    requireInteraction: false,
    data: { url: productionUrl(data.url, target) }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = productionUrl(event.notification.data?.url);

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
