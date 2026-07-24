export interface AdminNotification {
  id: string;
  message: string;
  createdAt: Date;
}

export let adminNotifications: AdminNotification[] = [];

export const addNotification = (message: string) => {
  adminNotifications.unshift({
    id: Math.random().toString(36).substring(2, 9),
    message,
    createdAt: new Date()
  });
  if (adminNotifications.length > 100) {
    adminNotifications = adminNotifications.slice(0, 100);
  }
};
