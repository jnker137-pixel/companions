const APP_URL = 'https://jnker137-pixel.github.io/companions/';

self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || '서아', {
      body: data.body || '',
      icon: '/companions/favicon.svg',
      badge: '/companions/favicon.svg',
      vibrate: [200, 100, 200],
      data: { url: data.data?.url || APP_URL + '?character=seoa' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = e.notification.data?.url || APP_URL + '?character=seoa';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
