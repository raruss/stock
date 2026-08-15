import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CATEGORY_SHELF_LIFE, describeDays, shiftFromToday, suggestShelfLife } from './shelfLife';
import { EMPTY_ITEM, type Item } from '../db/types';

const item = (patch: Partial<Item>): Item =>
  ({ ...EMPTY_ITEM, id: 1, name: 'X', createdAt: '2026-08-01T10:00:00.000Z', updatedAt: '', ...patch }) as Item;

describe('shiftFromToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15, 12, 0, 0)); // 15 серпня 2026
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    [3, 'day' as const, '2026-08-18'],
    [1, 'week' as const, '2026-08-22'],
    [1, 'month' as const, '2026-09-15'],
    [1, 'year' as const, '2027-08-15'],
  ])('+%i %s → %s', (amount, unit, expected) => {
    expect(shiftFromToday(amount, unit)).toBe(expected);
  });

  it('коректно перестрибує через кінець місяця', () => {
    vi.setSystemTime(new Date(2026, 0, 31, 12, 0, 0)); // 31 січня
    // date-fns тут не породжує «31 лютого», а притискає до останнього дня місяця.
    expect(shiftFromToday(1, 'month')).toBe('2026-02-28');
  });
});

describe('suggestShelfLife', () => {
  it('без історії бере типовий термін категорії', () => {
    expect(suggestShelfLife('dairy', [])).toEqual({
      days: CATEGORY_SHELF_LIFE.dairy,
      source: 'category',
    });
  });

  it('для категорій, що не псуються, не пропонує нічого', () => {
    expect(suggestShelfLife('household', [])).toBeNull();
    expect(suggestShelfLife('other', [])).toBeNull();
  });

  it('власна історія має пріоритет над категорією', () => {
    const history = [
      item({ createdAt: '2026-08-01T00:00:00.000Z', bestBefore: '2026-08-06' }), // 5 днів
      item({ createdAt: '2026-08-10T00:00:00.000Z', bestBefore: '2026-08-15' }), // 5 днів
    ];
    expect(suggestShelfLife('dairy', history)).toEqual({ days: 5, source: 'history' });
  });

  it('бере медіану, тож один випадковий викид не зміщує підказку', () => {
    const history = [
      item({ createdAt: '2026-08-01T00:00:00.000Z', bestBefore: '2026-08-06' }), // 5
      item({ createdAt: '2026-08-01T00:00:00.000Z', bestBefore: '2026-08-07' }), // 6
      item({ createdAt: '2026-08-01T00:00:00.000Z', bestBefore: '2027-08-01' }), // 365 — викид
    ];
    expect(suggestShelfLife('dairy', history)?.days).toBe(6);
  });

  it('ігнорує записи без терміну', () => {
    const history = [item({ bestBefore: null }), item({ bestBefore: null })];
    expect(suggestShelfLife('dairy', history)?.source).toBe('category');
  });

  it('ігнорує товари, додані вже простроченими', () => {
    // Такий зразок нічого не каже про типовий термін зберігання.
    const history = [item({ createdAt: '2026-08-10T00:00:00.000Z', bestBefore: '2026-08-01' })];
    expect(suggestShelfLife('dairy', history)?.source).toBe('category');
  });

  it('не падає на пошкодженій даті створення', () => {
    const history = [item({ createdAt: 'не дата', bestBefore: '2026-09-01' })];
    expect(() => suggestShelfLife('dairy', history)).not.toThrow();
    expect(suggestShelfLife('dairy', history)?.source).toBe('category');
  });
});

describe('describeDays', () => {
  it.each([
    [3, '3 дн.'],
    [7, 'тиждень'],
    [14, '2 тиж.'],
    [30, '1 міс.'],
    [90, '3 міс.'],
    [365, 'рік'],
    [730, '2 р.'],
    [5, '5 дн.'],
  ])('%i → %s', (days, expected) => {
    expect(describeDays(days)).toBe(expected);
  });
});
