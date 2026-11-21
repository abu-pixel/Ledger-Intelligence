// Runs before the app bundle. Never clear localStorage or IndexedDB: they hold ledgers.
(function () {
  var accountPath = /(?:^|\/)(?:\(auth\)|auth|sign-?in|sign-?up|log-?in|log-?out|sign-?out|sso-callback|forgot-password|reset-password)(?:\/|$)/i;
  function isAccountPath() {
    try { return accountPath.test(decodeURIComponent(location.pathname)); }
    catch (_) { return accountPath.test(location.pathname); }
  }
  if (isAccountPath()) {
    location.replace('/?workspace=account-free-v2');
    return;
  }
  // Old registrations can continue serving obsolete HTML even after a new deploy.
  var workers = navigator.serviceWorker;
  var registrations = workers
    ? workers.getRegistrations().then(function (items) {
        return Promise.all(items.map(function (item) { return item.unregister(); }))
          .then(function () { return items.length > 0; });
      }).catch(function () { return false; })
    : Promise.resolve(false);
  var cacheCleanup = typeof caches !== 'undefined'
    ? caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) { return caches.delete(key); }));
      }).catch(function () {})
    : Promise.resolve();
  Promise.all([registrations, cacheCleanup]).then(function (results) {
    var url = new URL(location.href);
    if ((results[0] || (workers && workers.controller)) &&
        url.searchParams.get('workspace') !== 'account-free-v2') {
      url.searchParams.set('workspace', 'account-free-v2');
      location.replace(url.href);
    }
  });
  window.addEventListener('pageshow', function (event) {
    if (isAccountPath()) location.replace('/?workspace=account-free-v2');
    else if (event.persisted) location.reload();
  });
})();
