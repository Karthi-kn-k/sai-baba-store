/**
 * System Web Notifications Utility
 * Triggers OS desktop & mobile system notifications via browser Web Notification API
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  // Register sw.js if ServiceWorker is supported
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js").catch(() => {});
    } catch (e) {
      // Ignore SW registration errors
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

  const trigger = (perm: string) => {
    if (perm !== "granted") return;
    try {
      const options: NotificationOptions = {
        body,
        icon: icon || "/favicon.svg",
        badge: "/favicon.svg",
        tag: `saibaba-store-${Date.now()}`,
        requireInteraction: true
      };

      let notificationSent = false;

      // 1. Try standard browser Notification API (works instantly on Desktop Chrome, Edge, Firefox, Safari)
      try {
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          n.close();
        };
        notificationSent = true;
      } catch (e) {
        // Ignored, fallback to ServiceWorker below
      }

      // 2. Service Worker fallback (required for Mobile Chrome/Android)
      if (!notificationSent && "serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, options);
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to display system notification:", err);
    }
  };

  if (Notification.permission === "granted") {
    trigger("granted");
  } else if (Notification.permission !== "denied") {
    requestNotificationPermission().then(granted => {
      if (granted) trigger("granted");
    });
  }
}
