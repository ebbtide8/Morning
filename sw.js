const CACHE_NAME = "morning-info-pwa-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// インストール時にアプリ本体とアイコンをキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュの自動削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// リクエスト制御
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 外部API（GAS・Open-Meteo・逆ジオコーディング）はService Workerでキャッシュせず直接通信
  if (url.origin !== self.location.origin) {
    return;
  }

  // 同一オリジンの静的ファイルはキャッシュ優先（バックグラウンドで最新版も更新）
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});