// Jeevo service worker: keeps the app shell available offline and shows push notifications.
const SHELL = "jeevo-shell-v1";
const FILES = ["./", "index.html", "app.css", "app.js", "../face/face.js", "manifest.webmanifest", "icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.pathname.startsWith("/api/") || u.pathname.startsWith("/ws")) return;
  // network first (the hub is on your own Wi-Fi), shell from cache when offline
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(SHELL).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
self.addEventListener("push", e => {
  let d = {}; try { d = e.data.json(); } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Jeevo", { body: d.body || "", tag: d.tag || "jeevo", icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "/app/#today" } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(ws => { for (const w of ws) if ("focus" in w) { w.navigate(e.notification.data.url); return w.focus(); } return self.clients.openWindow(e.notification.data.url); }));
});
