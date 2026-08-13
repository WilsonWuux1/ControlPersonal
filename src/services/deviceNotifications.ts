import type { AppNotification } from '../types/domain'

export const deviceNotificationsSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator

export const requestDeviceNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!deviceNotificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export const showDeviceNotification = async (notification: Pick<AppNotification, 'title' | 'message' | 'actionRoute'>): Promise<boolean> => {
  if (!deviceNotificationsSupported() || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(notification.title, {
    body: notification.message,
    icon: './pwa-192x192.png',
    badge: './pwa-192x192.png',
    data: { route: notification.actionRoute ?? '/' },
  })
  return true
}
