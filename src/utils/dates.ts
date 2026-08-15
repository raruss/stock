import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

export type ExpiryStatus = 'none' | 'ok' | 'soon' | 'critical' | 'expired';

/** Сьогоднішня дата у форматі 'yyyy-MM-dd' — у локальній таймзоні користувача. */
export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Розбирає 'yyyy-MM-dd' у Date локальної півночі.
 *
 * `new Date('2026-01-15')` — це UTC-північ, тож на захід від Гринвіча дало б 14 січня.
 * `parseISO` з date-fns трактує дату без часу як локальну — саме те, що треба для
 * календарного «терміну придатності».
 */
export function parseDateKey(key: string | null | undefined): Date | null {
  if (!key) return null;
  const parsed = parseISO(key);
  return isValid(parsed) ? parsed : null;
}

/**
 * Форматує термін для показу. Ніколи не кидає.
 *
 * Стара версія викликала `format(new Date(row.bestBefore))` напряму, і порожній термін
 * валив увесь застосунок через `RangeError: Invalid time value`.
 */
export function formatDate(key: string | null | undefined, fallback = '—'): string {
  const parsed = parseDateKey(key);
  return parsed ? format(parsed, 'd MMM yyyy', { locale: uk }) : fallback;
}

/** Скільки календарних днів лишилось. Від'ємне — прострочено. `null` — терміну немає. */
export function daysLeft(key: string | null | undefined): number | null {
  const parsed = parseDateKey(key);
  return parsed ? differenceInCalendarDays(parsed, new Date()) : null;
}

export function expiryStatus(
  key: string | null | undefined,
  criticalDays: number,
  warningDays: number,
): ExpiryStatus {
  const left = daysLeft(key);
  if (left === null) return 'none';
  if (left < 0) return 'expired';
  if (left <= criticalDays) return 'critical';
  if (left <= warningDays) return 'soon';
  return 'ok';
}

/** Людський підпис на кшталт «лишився 1 день» / «прострочено 3 дні тому». */
export function expiryLabel(key: string | null | undefined): string {
  const left = daysLeft(key);
  if (left === null) return 'без терміну';
  if (left < 0) return `прострочено ${plural(-left, 'день', 'дні', 'днів')} тому`;
  if (left === 0) return 'спливає сьогодні';
  if (left === 1) return 'лишився 1 день';
  return `лишилось ${plural(left, 'день', 'дні', 'днів')}`;
}

/** Українські числові форми: 1 день / 2 дні / 5 днів. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${many}`;
  if (last === 1) return `${n} ${one}`;
  if (last >= 2 && last <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

/**
 * Компаратор за терміном придатності: найтерміновіше — вгорі, товари без терміну — в кінці.
 *
 * Чиста функція, на відміну від старого `items.sort(...)`, який мутував проп прямо
 * під час рендеру.
 */
export function compareByExpiry(
  a: { bestBefore: string | null },
  b: { bestBefore: string | null },
): number {
  if (a.bestBefore === b.bestBefore) return 0;
  if (!a.bestBefore) return 1;
  if (!b.bestBefore) return -1;
  return a.bestBefore < b.bestBefore ? -1 : 1;
}
