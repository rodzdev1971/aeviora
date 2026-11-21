self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Display a generic notification for malformed payloads. */ }
  event.waitUntil(Promise.all([self.registration.showNotification(data.title || "Aeviora admin update", {
    body: data.body || "Open admin metrics to review recent signups.",
    tag: "aeviora-new-signup", data: { url: "/admin/metrics/signups" },
  }), self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => windows.forEach((client) => client.postMessage({ type: "ADMIN_METRICS_REFRESH" })))]));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("/admin/metrics/signups", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); return existing.focus(); }
    return self.clients.openWindow(url);
  })());
});
