// Simple service worker buat PWA FortisApp

self.addEventListener("install", (event) => {
  // langsung aktif tanpa nunggu reload
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Optional: cuma log fetch biar kelihatan kerja
self.addEventListener("fetch", () => {
  // kita belum cache apa-apa, biarin network default
});
