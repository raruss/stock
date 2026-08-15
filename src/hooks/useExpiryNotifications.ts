import { useEffect } from 'react';
import type { Item, Settings } from '../db/types';
import { daysLeft, plural } from '../utils/dates';

/**
 * Нагадування про терміни придатності.
 *
 * ВАЖЛИВЕ ОБМЕЖЕННЯ, про яке варто знати. Гарантованого щоденного нагадування
 * «о 9:00, навіть коли застосунок закритий» без сервера не існує: Web Push вимагає
 * push-сервісу, тобто бекенду, а цей застосунок свідомо повністю локальний.
 * Periodic Background Sync працює лише в Chrome на Android і лише для встановленої PWA.
 *
 * Тому нагадування — best-effort:
 *  - бейдж на іконці застосунку оновлюється завжди, коли застосунок відкритий;
 *  - системне сповіщення показується при відкритті, але не частіше разу на добу.
 */
export function useExpiryNotifications(
  items: Item[] | undefined,
  settings: Settings,
  onNotified: (isoDate: string) => void,
): void {
  const urgent = (items ?? []).filter((item) => {
    if (item.quantity <= 0) return false;
    const left = daysLeft(item.bestBefore);
    return left !== null && left <= settings.expiryCriticalDays;
  });

  const count = urgent.length;
  const names = urgent
    .slice(0, 3)
    .map((i) => i.name)
    .join(', ');

  useEffect(() => {
    if (items === undefined) return;

    // Бейдж на іконці — окрема від сповіщень можливість, дозволу не потребує.
    const badge = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (count > 0) void badge.setAppBadge?.(count).catch(() => {});
    else void badge.clearAppBadge?.().catch(() => {});

    if (!settings.notificationsEnabled || count === 0) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (isSameDay(settings.lastNotifiedAt, new Date())) return;

    const title = `${plural(count, 'товар', 'товари', 'товарів')} треба з'їсти`;
    const body = count > 3 ? `${names} та інші` : names;

    void navigator.serviceWorker?.ready
      .then((registration) =>
        registration.showNotification(title, {
          body,
          icon: '/stock/logo192.png',
          badge: '/stock/logo192.png',
          tag: 'expiry', // замінює попереднє сповіщення замість того, щоб громадити стос
        }),
      )
      .catch(() => {
        // Без service worker (наприклад, у dev-режимі) пробуємо простий конструктор.
        try {
          new Notification(title, { body });
        } catch {
          /* сповіщення не критичні */
        }
      });

    onNotified(new Date().toISOString());
  }, [items, count, names, settings.notificationsEnabled, settings.lastNotifiedAt, onNotified]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

function isSameDay(iso: string | null, other: Date): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return (
    date.getFullYear() === other.getFullYear() &&
    date.getMonth() === other.getMonth() &&
    date.getDate() === other.getDate()
  );
}
