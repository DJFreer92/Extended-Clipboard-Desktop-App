// Simple service worker for Extended Clipboard PWA
const CACHE_NAME = "extended-clipboard-v1";
const urlsToCache = [
	"/",
	"/index.html",
	"/manifest.json"
	// Add other static assets as needed
];

self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)));
});

self.addEventListener("fetch", (event) => {
	// Only cache GET requests
	if (event.request.method !== "GET") {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((response) => {
			// Return cached version or fetch from network
			return response || fetch(event.request);
		})
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});
