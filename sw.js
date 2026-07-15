const CACHE_NAME = "pendu-v1";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
  // ⚠️ manifest.json intentionnellement absent du cache
];

// ——— INSTALL : mise en cache des ressources statiques ———
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Mise en cache des ressources initiales");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ——— ACTIVATE : nettoyage des anciens caches ———
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("[SW] Suppression de l'ancien cache :", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ——— FETCH : stratégie Cache First, réseau en fallback ———
self.addEventListener("fetch", event => {
  // On ignore les requêtes non-GET
  if (event.request.method !== "GET") return;
  // On ignore les extensions navigateur
  if (!event.request.url.startsWith("http")) return;
  // ⚠️ On laisse le manifest toujours passer par le réseau
  if (event.request.url.includes("manifest.json")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached; // Réponse depuis le cache
      }

      // Pas en cache → on va chercher sur le réseau
      return fetch(event.request)
        .then(response => {
          // On ne met en cache que les réponses valides
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // On clone la réponse (elle ne peut être lue qu'une fois)
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Hors ligne et ressource non cachée → fallback sur index.html
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
