const C = "sawtak-voice-v1", A = ["./", "index.html", "app.js", "style.css", "manifest.webmanifest", "icon.svg"];
self.addEventListener("install", e => e.waitUntil(caches.open(C).then(c => c.addAll(A))));
self.addEventListener("fetch", e => { if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return; e.respondWith(fetch(e.request).then(r => { caches.open(C).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request))); });
