/* Service worker AJESA : mode hors-ligne + notifications OneSignal */

/* 1) OneSignal : ne fait rien tant que l'app n'est pas initialisee avec un App ID valide */
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

/* 2) Cache de l'application (app shell) */
const CACHE_NAME = "ajesa-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ne touche qu'aux requetes GET de notre propre site (pas JSONBin, Cloudinary, Maps, AdSense, OneSignal...)
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Page HTML : reseau d'abord (contenu a jour), cache en secours si hors-ligne
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Autres fichiers du site (icones, manifest...) : cache d'abord, reseau en secours
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});
