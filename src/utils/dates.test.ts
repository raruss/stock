import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { compareByExpiry, daysLeft, expiryStatus, formatDate, plural } from './dates';

describe('formatDate', () => {
  /**
   * Ключова регресія: `Grid.js:60` викликав `format(new Date(row.bestBefore))` напряму,
   * і порожній термін валив увесь застосунок через RangeError.
   */
  it.each([null, undefined, '', 'не дата', '0000-00-00'])(
    'не кидає на некоректному значенні %o',
    (input) => {
      expect(() => formatDate(input)).not.toThrow();
      expect(formatDate(input)).toBe('—');
    },
  );

  it('форматує коректну дату', () => {
    expect(formatDate('2026-09-01')).toMatch(/2026/);
  });

  it('дозволяє власний запасний текст', () => {
    expect(formatDate(null, 'без терміну')).toBe('без терміну');
  });
});

describe('daysLeft і expiryStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 14, 12, 0, 0)); // 14 серпня 2026, локальний полудень
  });
  afterEach(() => vi.useRealTimers());

  it('рахує дні в локальній таймзоні, без зсуву на добу', () => {
    // Наївний `new Date('2026-08-14')` дав би UTC-північ і на захід від Гринвіча
    // показав би -1 день замість 0.
    expect(daysLeft('2026-08-14')).toBe(0);
    expect(daysLeft('2026-08-15')).toBe(1);
    expect(daysLeft('2026-08-13')).toBe(-1);
  });

  it('повертає null, якщо терміну немає', () => {
    expect(daysLeft(null)).toBeNull();
    expect(expiryStatus(null, 3, 7)).toBe('none');
  });

  it.each([
    ['2026-08-10', 'expired'],
    ['2026-08-14', 'critical'],
    ['2026-08-16', 'critical'],
    ['2026-08-19', 'soon'],
    ['2026-12-01', 'ok'],
  ])('%s → %s', (date, expected) => {
    expect(expiryStatus(date, 3, 7)).toBe(expected);
  });
});

describe('compareByExpiry', () => {
  it('ставить найтерміновіше вгору, а товари без терміну — вниз', () => {
    const items = [
      { bestBefore: null },
      { bestBefore: '2026-12-01' },
      { bestBefore: '2026-01-01' },
      { bestBefore: null },
    ];
    const sorted = [...items].sort(compareByExpiry);
    expect(sorted.map((i) => i.bestBefore)).toEqual(['2026-01-01', '2026-12-01', null, null]);
  });

  it('не мутує вхідний масив (стара версія сортувала проп під час рендеру)', () => {
    const items = [{ bestBefore: '2026-12-01' }, { bestBefore: '2026-01-01' }];
    const copy = [...items];
    [...items].sort(compareByExpiry);
    expect(items).toEqual(copy);
  });
});

describe('plural', () => {
  it.each([
    [1, '1 день'],
    [2, '2 дні'],
    [4, '4 дні'],
    [5, '5 днів'],
    [11, '11 днів'],
    [21, '21 день'],
    [22, '22 дні'],
    [25, '25 днів'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, 'день', 'дні', 'днів')).toBe(expected);
  });
});
