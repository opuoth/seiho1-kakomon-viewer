const CACHE_NAME = "seiho1-viewer-v15";

const CACHE_TARGETS = [
  "./",
  "./index.html",
  "./vendor/fast-pdf-viewer.html?v=8",
  "./vendor/fast-pdf-viewer.css?v=4",
  "./vendor/fast-pdf-viewer.mjs?v=8"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_TARGETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("seiho1-viewer-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!/^https?:$/.test(url.protocol) || url.origin !== self.location.origin) return;

  const isPdf = url.pathname.endsWith(".pdf");
  const isAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/data/") ||
    url.pathname.includes("/vendor/pdfjs-5.7.284-legacy/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".mjs") ||
    url.pathname.endsWith(".css");

  if (isPdf || isAsset) {
    event.respondWith(
      caches.match(event.request).then(async cached => {
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const copy = response.clone();
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(event.request, copy);
            } catch (_) {}
          }
          return response;
        } catch (_) {
          return new Response("Resource unavailable", {status:503, statusText:"Service Unavailable"});
        }
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      return cached || new Response("Resource unavailable", {status:503, statusText:"Service Unavailable"});
    })
  );
});
