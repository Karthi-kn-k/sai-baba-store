/**
 * System Web Notifications Utility
 * Triggers OS desktop & mobile system notifications via browser Web Notification API
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  // Register dummy inline ServiceWorker if available to enable OS-level notifications
  if ("serviceWorker" in navigator) {
    try {
      const swCode = `
        self.addEventListener('install', e => self.skipWaiting());
        self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
        self.addEventListener('notificationclick', e => {
          e.notification.close();
          e.waitUntil(clients.matchAll({type:'window'}).then(c => c.length > 0 ? c[0].focus() : clients.openWindow('/')));
        });
      `;
      const blob = new Blob([swCode], { type: "application/javascript" });
      const swUrl = URL.createObjectURL(blob);
      await navigator.serviceWorker.register(swUrl).catch(() => {});
    } catch (e) {
      // Ignore fallback SW creation errors
    }
  }

  if (Notification.permission === "granted") {
    return true;
  }
  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    }
  }
  return false;
}

export function sendSystemNotification(title: string, body: string, icon?: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted") {
    try {
      const options = {
        body,
        icon: icon || "/favicon.svg",
        badge: "/favicon.svg",
        tag: `saibaba-store-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      };

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, options);
        }).catch(() => {
          new Notification(title, options);
        });
      } else {
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }
    } catch (err) {
      console.error("Failed to display system notification:", err);
    }
  }
}
