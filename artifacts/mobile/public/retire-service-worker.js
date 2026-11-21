// Replaces obsolete app workers when the browser checks their original URL.
self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    await Promise.all((await caches.keys()).map(function (key) { return caches.delete(key); }));
    await self.registration.unregister();
    var windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(windows.map(function (client) {
      var url = new URL(client.url);
      url.pathname = '/';
      url.search = '?workspace=account-free-v2';
      url.hash = '';
      return client.navigate(url.href).catch(function () {});
    }));
  })());
});
