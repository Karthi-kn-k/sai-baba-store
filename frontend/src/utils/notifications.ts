/**
 * System Web Notifications Utility
 * Triggers OS desktop & mobile system notifications via browser Web Notification API
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
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
        requireInteraction: true
      };

      // Try ServiceWorker registration first (required on mobile Chrome / PWA)
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
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
