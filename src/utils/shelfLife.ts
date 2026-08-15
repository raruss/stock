import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, format } from 'date-fns';
import type { Category, Item } from '../db/types';
import { parseDateKey } from './dates';

export type ShiftUnit = 'day' | 'week' | 'month' | 'year';

/** Зсуває сьогоднішню дату й повертає ключ 'yyyy-MM-dd'. */
export function shiftFromToday(amount: number, unit: ShiftUnit): string {
  const base = new Date();
  const next =
    unit === 'day'
      ? addDays(base, amount)
      : unit === 'week'
        ? addWeeks(base, amount)
        : unit === 'month'
          ? addMonths(base, amount)
          : addYears(base, amount);
  return format(next, 'yyyy-MM-dd');
}

/**
 * Типовий термін зберігання за категорією, у днях від дня купівлі.
 *
 * Це навмисно грубі, консервативні числа — вони лише економлять дотики, а не
 * замінюють напис на упаковці. `null` означає «не псується», тож для таких
 * категорій нічого не пропонуємо.
 */
export const CATEGORY_SHELF_LIFE: Record<Category, number | null> = {
  dairy: 7,
  meat: 3,
  vegetables: 10,
  fruits: 7,
  grains: 365,
  drinks: 180,
  frozen: 180,
  sweets: 120,
  canned: 730,
  household: null,
  other: null,
};

export interface ShelfLifeSuggestion {
  days: number;
  /** 'history' — порахували з ваших попередніх покупок цього ж товару. */
  source: 'history' | 'category';
}

/**
 * Скільки днів зазвичай «живе» цей товар.
 *
 * Власна історія має пріоритет над категорією: якщо ви вже двічі купували те саме
 * молоко і щоразу ставили термін на 5 днів, то п'ять днів — точніша підказка, ніж
 * усереднені сім для всього молочного.
 *
 * Історія береться з наявних товарів — окрема таблиця не потрібна, бо записи з
 * нульовою кількістю ми не видаляємо.
 */
export function suggestShelfLife(
  category: Category,
  history: Item[],
): ShelfLifeSuggestion | null {
  const samples = history
    .map(toShelfLifeDays)
    .filter((days): days is number => days !== null)
    // Беремо кілька останніх: якщо виробник змінив термін, старі покупки не мають
    // тягнути підказку назад.
    .slice(-5);

  if (samples.length > 0) return { days: median(samples), source: 'history' };

  const fallback = CATEGORY_SHELF_LIFE[category];
  return fallback === null ? null : { days: fallback, source: 'category' };
}

/** Скільки днів було між додаванням товару і його терміном придатності. */
function toShelfLifeDays(item: Item): number | null {
  const bestBefore = parseDateKey(item.bestBefore);
  if (!bestBefore) return null;

  const created = parseDateKey(item.createdAt.slice(0, 10));
  if (!created) return null;

  const days = differenceInCalendarDays(bestBefore, created);
  // Від'ємне означає, що товар додали вже простроченим — як зразок це сміття.
  return days > 0 ? days : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : sorted[middle]!;
}

/** «7 днів» → зрозумілий підпис на кнопці. */
export function describeDays(days: number): string {
  if (days >= 365 && days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? 'рік' : `${years} р.`;
  }
  if (days >= 30 && days % 30 === 0) return `${days / 30} міс.`;
  if (days >= 7 && days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? 'тиждень' : `${weeks} тиж.`;
  }
  return `${days} дн.`;
}
